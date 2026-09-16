import { createClient } from "@/lib/supabase/server";
import { findTopicByName } from "@/lib/naver-directory";
import { isValidPath } from "@/lib/category-tree";
import { collectBlogPostsInPeriod } from "@/lib/naver-blog-search";
import { extractCandidateKeywords } from "@/lib/keyword-extract";
import { generateLlmKeywordCandidates } from "@/lib/llm-keywords";
import { getNaverSearchVolumeBatch } from "@/lib/naver";
import { getNaverBlogCount } from "@/lib/naver-docs";
import { getCompetition } from "@/lib/competition";

export const maxDuration = 60;

export type CategoryKeyword = {
  keyword: string;
  source: "collected" | "llm";
  freq: number | null;
  pcCount: number | null;
  mobileCount: number | null;
  totalSearch: number | null;
  docCount: number | null;
  competition: "유리" | "보통" | "포화" | null;
};

type PeriodInput = { preset?: "7d" | "30d" | "90d" | "custom"; startDate?: string; endDate?: string };
type RequestBody = { l1?: string; l2?: string; l3?: string; l4?: string; l5?: string; period?: PeriodInput };

// 문서수/검색량 비율 임계값은 다른 페이지의 경쟁도 카드와 동일 기준(30 / 150 상당)을 사용한다.
function getCompetitionLabel(docCount: number, totalSearch: number): CategoryKeyword["competition"] {
  const c = getCompetition(docCount, totalSearch);
  if (!c) return null;
  if (c.grade === "golden" || c.grade === "low") return "유리";
  if (c.grade === "medium") return "보통";
  return "포화";
}

function toYyyyMmDd(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function resolvePeriod(period: PeriodInput | undefined): { startDate: string; endDate: string } {
  const today = new Date();
  const end = toYyyyMmDd(today);

  if (period?.preset === "custom" && period.startDate && period.endDate) {
    return {
      startDate: period.startDate.replace(/-/g, ""),
      endDate: period.endDate.replace(/-/g, ""),
    };
  }

  const days = period?.preset === "7d" ? 7 : period?.preset === "90d" ? 90 : 30;
  const start = new Date(today);
  start.setDate(start.getDate() - days);

  return { startDate: toYyyyMmDd(start), endDate: end };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "로그인이 필요합니다." }), { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const { l1, l2, l3, l4, l5, period } = body ?? {};

  if (!l1 || !l2 || !l3 || !l4 || !l5) {
    return new Response(JSON.stringify({ error: "카테고리 경로(1~5단계)를 모두 선택해주세요." }), { status: 400 });
  }
  if (!isValidPath(l1, l2, l3, l4, l5)) {
    return new Response(JSON.stringify({ error: "존재하지 않는 카테고리 경로입니다." }), { status: 400 });
  }

  const topic = findTopicByName(l1, l2);
  const query = `${l4} ${l5}`.trim();
  const { startDate, endDate } = resolvePeriod(period);

  const encoder = new TextEncoder();
  let controllerRef!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
  });

  function send(event: Record<string, unknown>) {
    controllerRef.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
  }

  (async () => {
    try {
      send({ type: "step", step: "collect", status: "running" });
      const posts = await collectBlogPostsInPeriod(query, startDate, endDate, 200);
      send({ type: "step", step: "collect", status: "done", postCount: posts.length });

      send({ type: "step", step: "extract", status: "running" });
      const candidates = extractCandidateKeywords(
        posts.map((p) => `${p.title} ${p.description}`),
        100,
      );
      send({ type: "step", step: "extract", status: "done", candidateCount: candidates.length });

      send({ type: "step", step: "llm", status: "running" });
      let llmKeywords: string[] = [];
      try {
        llmKeywords = await generateLlmKeywordCandidates(
          [l1, l2, l3, l4, l5],
          candidates.map((c) => c.keyword),
          10,
        );
      } catch {
        // LLM 후보는 보조 기능이므로 실패해도 파이프라인은 계속 진행한다.
      }
      const collectedNames = new Set(candidates.map((c) => c.keyword));
      llmKeywords = llmKeywords.filter((k) => !collectedNames.has(k));
      send({ type: "step", step: "llm", status: "done", llmCount: llmKeywords.length });

      const pendingKeywords: CategoryKeyword[] = [
        ...candidates.map((c) => ({
          keyword: c.keyword,
          source: "collected" as const,
          freq: c.freq,
          pcCount: null,
          mobileCount: null,
          totalSearch: null,
          docCount: null,
          competition: null,
        })),
        ...llmKeywords.map((k) => ({
          keyword: k,
          source: "llm" as const,
          freq: null,
          pcCount: null,
          mobileCount: null,
          totalSearch: null,
          docCount: null,
          competition: null,
        })),
      ];
      send({
        type: "partial",
        topic,
        query,
        postCount: posts.length,
        keywords: pendingKeywords,
      });

      send({ type: "step", step: "verify", status: "running" });
      const volumeMap = await getNaverSearchVolumeBatch(pendingKeywords.map((k) => k.keyword));

      const withVolume = pendingKeywords.map((k) => {
        const volume = volumeMap.get(k.keyword);
        const totalSearch = volume ? volume.pcCount + volume.mobileCount : 0;
        return { ...k, pcCount: volume?.pcCount ?? 0, mobileCount: volume?.mobileCount ?? 0, totalSearch };
      });

      const collectedFinal = withVolume
        .filter((k) => k.source === "collected" && k.totalSearch >= 10)
        .map((k) => ({
          ...k,
          score: (k.freq ?? 1) * Math.log(k.totalSearch + 1),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 60);
      const llmFinal = withVolume.filter((k) => k.source === "llm");

      const finalList = [...collectedFinal, ...llmFinal];

      const docCounts = await Promise.allSettled(finalList.map((k) => getNaverBlogCount(k.keyword)));

      const keywords: CategoryKeyword[] = finalList.map((k, i) => {
        const docResult = docCounts[i];
        const docCount = docResult.status === "fulfilled" ? docResult.value : null;
        return {
          keyword: k.keyword,
          source: k.source,
          freq: k.freq,
          pcCount: k.pcCount,
          mobileCount: k.mobileCount,
          totalSearch: k.totalSearch,
          docCount,
          competition: docCount !== null ? getCompetitionLabel(docCount, k.totalSearch) : null,
        };
      });

      send({ type: "step", step: "verify", status: "done" });
      send({
        type: "result",
        topic,
        query,
        postCount: posts.length,
        generatedAt: new Date().toISOString(),
        keywords,
      });
    } catch (err) {
      send({ type: "error", message: err instanceof Error ? err.message : "카테고리 키워드 조회 중 오류가 발생했습니다." });
    } finally {
      controllerRef.close();
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
