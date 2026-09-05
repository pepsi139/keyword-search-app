import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findTopic, getDirectoryTitles } from "@/lib/naver-directory";
import { extractCandidateKeywords } from "@/lib/keyword-extract";
import { getNaverSearchVolumeBatch } from "@/lib/naver";
import { getNaverBlogCount } from "@/lib/naver-blog";

export const maxDuration = 45;

export type CategoryKeyword = {
  keyword: string;
  freq: number;
  pcCount: number;
  mobileCount: number;
  totalSearch: number;
  docCount: number | null;
  competition: "유리" | "보통" | "포화" | null;
};

// 문서수/검색량 비율 임계값은 기존 키워드 검색량 비교 페이지의 경쟁도 카드와
// 동일한 기준(30 / 150)을 사용한다 — 둘 다 같은 네이버 블로그 검색 API의
// 전체 문서수(부분 일치 포함)를 분모로 쓰므로 실측 스케일이 같다.
function getCompetitionLabel(docCount: number, totalSearch: number): CategoryKeyword["competition"] {
  if (totalSearch <= 0) return null;
  const ratio = docCount / totalSearch;
  if (ratio < 30) return "유리";
  if (ratio < 150) return "보통";
  return "포화";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { directorySeq?: number } | null;
  const directorySeq = body?.directorySeq;

  if (typeof directorySeq !== "number") {
    return NextResponse.json({ error: "주제를 선택해주세요." }, { status: 400 });
  }

  const topic = findTopic(directorySeq);
  if (!topic) {
    return NextResponse.json({ error: "알 수 없는 주제입니다." }, { status: 400 });
  }

  try {
    const titles = await getDirectoryTitles(directorySeq, 8);
    const candidates = extractCandidateKeywords(titles, 50);

    if (candidates.length === 0) {
      return NextResponse.json({
        topic,
        postCount: titles.length,
        generatedAt: new Date().toISOString(),
        keywords: [] as CategoryKeyword[],
      });
    }

    const volumeMap = await getNaverSearchVolumeBatch(candidates.map((c) => c.keyword));

    const withVolume = candidates
      .map((c) => {
        const volume = volumeMap.get(c.keyword);
        const totalSearch = volume ? volume.pcCount + volume.mobileCount : 0;
        return { ...c, pcCount: volume?.pcCount ?? 0, mobileCount: volume?.mobileCount ?? 0, totalSearch };
      })
      .filter((c) => c.totalSearch >= 10)
      .map((c) => ({ ...c, score: c.freq * (1 + 0.15 * (c.n - 1)) * Math.log(c.totalSearch + 1) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    const docCounts = await Promise.allSettled(
      withVolume.map((c) => getNaverBlogCount(c.keyword)),
    );

    const keywords: CategoryKeyword[] = withVolume.map((c, i) => {
      const docResult = docCounts[i];
      const docCount = docResult.status === "fulfilled" ? docResult.value : null;
      return {
        keyword: c.keyword,
        freq: c.freq,
        pcCount: c.pcCount,
        mobileCount: c.mobileCount,
        totalSearch: c.totalSearch,
        docCount,
        competition: docCount !== null ? getCompetitionLabel(docCount, c.totalSearch) : null,
      };
    });

    return NextResponse.json({
      topic,
      postCount: titles.length,
      generatedAt: new Date().toISOString(),
      keywords,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "카테고리 키워드 조회 중 오류가 발생했습니다." },
      { status: 502 },
    );
  }
}
