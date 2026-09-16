"use client";

import { useState } from "react";
import { DIRECTORY_GROUPS } from "@/lib/naver-directory";
import type { CategoryKeyword } from "@/app/api/category-keywords/route";

type SortKey = "score" | "search" | "freq" | "competition";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "score", label: "추천순" },
  { id: "search", label: "검색량순" },
  { id: "freq", label: "등장빈도순" },
  { id: "competition", label: "경쟁도순" },
];

const PERIOD_OPTIONS: { id: "7d" | "30d" | "90d" | "custom"; label: string }[] = [
  { id: "7d", label: "최근 7일" },
  { id: "30d", label: "최근 30일" },
  { id: "90d", label: "최근 90일" },
  { id: "custom", label: "기간 직접 지정" },
];

const STEP_LABELS: { id: "collect" | "extract" | "llm" | "verify"; title: string; desc: string }[] = [
  { id: "collect", title: "블로그 글 수집", desc: "경로 조합 쿼리로 최근 글 최대 200건 수집" },
  { id: "extract", title: "빈도 기반 추출", desc: "실제 글에서 자주 쓰인 단어 추출" },
  { id: "llm", title: "LLM 후보 생성", desc: "수집 글에 없던 하위 키워드 후보 제안" },
  { id: "verify", title: "검색량 검증", desc: "검색광고 API로 후보 키워드 실측" },
];

type StepStatus = "idle" | "running" | "done";
type Steps = Record<"collect" | "extract" | "llm" | "verify", StepStatus>;

const IDLE_STEPS: Steps = { collect: "idle", extract: "idle", llm: "idle", verify: "idle" };

const COMPETITION_RANK: Record<string, number> = { 유리: 0, 보통: 1, 포화: 2 };

const numberFormat = new Intl.NumberFormat("ko-KR");

function competitionColor(level: CategoryKeyword["competition"]) {
  if (level === "유리") return "text-emerald-600 dark:text-emerald-400";
  if (level === "보통") return "text-amber-600 dark:text-amber-400";
  if (level === "포화") return "text-red-600 dark:text-red-400";
  return "text-zinc-400";
}

function downloadCsv(label: string, keywords: CategoryKeyword[]) {
  const header = ["키워드", "유형", "등장빈도", "PC검색량", "모바일검색량", "합계검색량", "문서수", "경쟁도"];
  const rows = keywords.map((k) => [
    k.keyword,
    k.source === "llm" ? "LLM 후보" : "수집",
    k.freq ?? "",
    k.pcCount ?? "",
    k.mobileCount ?? "",
    k.totalSearch ?? "",
    k.docCount ?? "",
    k.competition ?? "",
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `카테고리키워드_${label}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

type Subtree = Record<string, Record<string, Record<string, string[]>>>;

export function CategoryKeywordPanel() {
  const [l1, setL1] = useState<string | null>(null);
  const [l2, setL2] = useState<string | null>(null);
  const [l3, setL3] = useState<string | null>(null);
  const [l4, setL4] = useState<string | null>(null);
  const [l5, setL5] = useState<string | null>(null);
  const [l6, setL6] = useState<string>("");

  const [subtree, setSubtree] = useState<Subtree | null>(null);
  const [subtreeLoading, setSubtreeLoading] = useState(false);

  const [periodPreset, setPeriodPreset] = useState<"7d" | "30d" | "90d" | "custom">("30d");
  const [startDate, setStartDate] = useState(daysAgoStr(30));
  const [endDate, setEndDate] = useState(todayStr());

  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [minSearch, setMinSearch] = useState(0);
  const [goldenOnly, setGoldenOnly] = useState(false);

  const [steps, setSteps] = useState<Steps>(IDLE_STEPS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryLabel, setQueryLabel] = useState<string | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<CategoryKeyword[]>([]);

  const group = DIRECTORY_GROUPS.find((g) => g.name === l1) ?? null;
  const topicNames = group ? group.subGroups.flatMap((s) => s.topics.map((t) => t.name)) : [];

  const l3Names = subtree ? Object.keys(subtree) : [];
  const l4Names = subtree && l3 ? Object.keys(subtree[l3] ?? {}) : [];
  const l5Names = subtree && l3 && l4 ? Object.keys(subtree[l3]?.[l4] ?? {}) : [];
  const l6Names = subtree && l3 && l4 && l5 ? subtree[l3]?.[l4]?.[l5] ?? [] : [];

  function resetDownstream(from: "l1" | "l2" | "l3" | "l4" | "l5") {
    if (from === "l1") {
      setL2(null);
      setSubtree(null);
    }
    if (from === "l1" || from === "l2") setL3(null);
    if (from === "l1" || from === "l2" || from === "l3") setL4(null);
    if (from === "l1" || from === "l2" || from === "l3" || from === "l4") setL5(null);
    setL6("");
    setSteps(IDLE_STEPS);
    setKeywords([]);
    setError(null);
  }

  async function handleL1Change(value: string) {
    setL1(value || null);
    resetDownstream("l1");
  }

  async function handleL2Change(value: string) {
    setL2(value || null);
    resetDownstream("l2");
    if (!value || !l1) return;
    setSubtreeLoading(true);
    try {
      const res = await fetch(`/api/category-tree?l1=${encodeURIComponent(l1)}&l2=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (res.ok) setSubtree(data.subtree);
      else setError(data.error ?? "카테고리 트리를 불러오지 못했습니다.");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubtreeLoading(false);
    }
  }

  function handleL3Change(value: string) {
    setL3(value || null);
    resetDownstream("l3");
  }
  function handleL4Change(value: string) {
    setL4(value || null);
    resetDownstream("l4");
  }

  async function runPipeline(seq5: string) {
    if (!l1 || !l2 || !l3 || !l4) return;
    setLoading(true);
    setError(null);
    setKeywords([]);
    setMinSearch(0);
    setGoldenOnly(false);
    setSteps({ collect: "running", extract: "idle", llm: "idle", verify: "idle" });

    const period =
      periodPreset === "custom"
        ? { preset: "custom" as const, startDate, endDate }
        : { preset: periodPreset };

    try {
      const res = await fetch("/api/category-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ l1, l2, l3, l4, l5: seq5, period }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "조회 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === "step") {
            setSteps((prev) => ({ ...prev, [event.step]: event.status }));
          } else if (event.type === "partial") {
            setQueryLabel(event.query);
            setPostCount(event.postCount);
            setKeywords(event.keywords);
          } else if (event.type === "result") {
            setQueryLabel(event.query);
            setPostCount(event.postCount);
            setGeneratedAt(event.generatedAt);
            setKeywords(event.keywords);
          } else if (event.type === "error") {
            setError(event.message);
          }
        }
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleL5Change(value: string) {
    setL5(value || null);
    setL6("");
    if (value) runPipeline(value);
  }

  function handleRecollect() {
    if (l5) runPipeline(l5);
  }

  const sortedKeywords = [...keywords].sort((a, b) => {
    if (sortKey === "search") return (b.totalSearch ?? -1) - (a.totalSearch ?? -1);
    if (sortKey === "freq") return (b.freq ?? -1) - (a.freq ?? -1);
    if (sortKey === "competition") {
      const ra = a.competition ? COMPETITION_RANK[a.competition] : 99;
      const rb = b.competition ? COMPETITION_RANK[b.competition] : 99;
      return ra - rb;
    }
    const scoreA = (a.freq ?? 0) * Math.log((a.totalSearch ?? 0) + 1);
    const scoreB = (b.freq ?? 0) * Math.log((b.totalSearch ?? 0) + 1);
    return scoreB - scoreA;
  });

  const filteredKeywords = sortedKeywords.filter((k) => {
    if ((k.totalSearch ?? 0) < minSearch) return false;
    if (goldenOnly && k.competition !== "유리") return false;
    if (l6 && !k.keyword.includes(l6)) return false;
    return true;
  });

  const pathLabel = [l1, l2, l3, l4, l5].filter(Boolean).join(" > ");

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">카테고리 경로</h2>
        {pathLabel && <p className="mt-1 text-xs text-zinc-400">{pathLabel}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500">1단계 (네이버 공식)</span>
          <select
            value={l1 ?? ""}
            onChange={(e) => handleL1Change(e.target.value)}
            disabled={loading}
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-2 text-sm outline-none focus:border-black disabled:opacity-50 dark:border-white/[.16] dark:focus:border-white"
          >
            <option value="">선택</option>
            {DIRECTORY_GROUPS.map((g) => (
              <option key={g.seq} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500">2단계 (네이버 공식)</span>
          <select
            value={l2 ?? ""}
            onChange={(e) => handleL2Change(e.target.value)}
            disabled={loading || !group}
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-2 text-sm outline-none focus:border-black disabled:opacity-50 dark:border-white/[.16] dark:focus:border-white"
          >
            <option value="">선택</option>
            {topicNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500">3단계 (자체 설계)</span>
          <select
            value={l3 ?? ""}
            onChange={(e) => handleL3Change(e.target.value)}
            disabled={loading || subtreeLoading || !subtree}
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-2 text-sm outline-none focus:border-black disabled:opacity-50 dark:border-white/[.16] dark:focus:border-white"
          >
            <option value="">{subtreeLoading ? "불러오는 중…" : "선택"}</option>
            {l3Names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500">4단계 (자체 설계)</span>
          <select
            value={l4 ?? ""}
            onChange={(e) => handleL4Change(e.target.value)}
            disabled={loading || !l3}
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-2 text-sm outline-none focus:border-black disabled:opacity-50 dark:border-white/[.16] dark:focus:border-white"
          >
            <option value="">선택</option>
            {l4Names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500">5단계 (여기서 조회 실행)</span>
          <select
            value={l5 ?? ""}
            onChange={(e) => handleL5Change(e.target.value)}
            disabled={loading || !l4}
            className="rounded-md border border-blue-400 bg-transparent px-2 py-2 text-sm font-medium outline-none focus:border-blue-600 disabled:opacity-50 dark:border-blue-500"
          >
            <option value="">선택</option>
            {l5Names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500">6단계 (결과 내 필터)</span>
          <select
            value={l6}
            onChange={(e) => setL6(e.target.value)}
            disabled={loading || l6Names.length === 0}
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-2 text-sm outline-none focus:border-black disabled:opacity-50 dark:border-white/[.16] dark:focus:border-white"
          >
            <option value="">전체 보기</option>
            {l6Names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-zinc-400">
        1~4단계는 경로만 좁히는 선택이고, 5단계를 고르는 순간 실제 조회(수집→추출→생성→검증)가 실행돼요. 6단계는
        API를 다시 부르지 않고 5단계 결과 안에서 키워드에 포함된 단어로 골라보는 필터예요.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500">수집 기간</span>
          <select
            value={periodPreset}
            onChange={(e) => setPeriodPreset(e.target.value as typeof periodPreset)}
            disabled={loading}
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-2 text-sm outline-none focus:border-black disabled:opacity-50 dark:border-white/[.16] dark:focus:border-white"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {periodPreset === "custom" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-zinc-500">시작일</span>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
                className="rounded-md border border-black/[.12] bg-transparent px-2 py-2 text-sm outline-none focus:border-black disabled:opacity-50 dark:border-white/[.16] dark:focus:border-white"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-zinc-500">종료일</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={todayStr()}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={loading}
                className="rounded-md border border-black/[.12] bg-transparent px-2 py-2 text-sm outline-none focus:border-black disabled:opacity-50 dark:border-white/[.16] dark:focus:border-white"
              />
            </label>
          </>
        )}

        <button
          type="button"
          onClick={handleRecollect}
          disabled={loading || !l5}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          이 조건으로 재수집
        </button>
      </div>

      {(loading || keywords.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-4">
          {STEP_LABELS.map((s) => {
            const status = steps[s.id];
            return (
              <div
                key={s.id}
                className="rounded-lg border border-black/[.08] p-3 dark:border-white/[.12]"
              >
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    status === "done"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : status === "running"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                        : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                  }`}
                >
                  {status === "done" ? "완료" : status === "running" ? "진행 중" : "대기"}
                </span>
                <p className="mt-1.5 text-sm font-medium">{s.title}</p>
                <p className="text-xs text-zinc-400">{s.desc}</p>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {keywords.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">
                {l5}{" "}
                <span className="text-sm font-normal text-zinc-400">
                  대표 키워드 {filteredKeywords.length}개
                  {postCount !== null && ` · 수집 글 ${postCount}건 분석`}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                검색 쿼리 &quot;{queryLabel}&quot; (4~5단계 경로 조합)
                {generatedAt && ` · 생성 시각 ${new Date(generatedAt).toLocaleString("ko-KR")}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadCsv(l5 ?? "결과", filteredKeywords)}
              disabled={filteredKeywords.length === 0}
              className="rounded-md border border-black/[.12] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.16] dark:hover:bg-white/[.06]"
            >
              CSV 다운로드
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortKey(opt.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    sortKey === opt.id
                      ? "bg-black/[.06] text-black dark:bg-white/[.1] dark:text-white"
                      : "text-zinc-500 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/[.06]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              최소 검색량
              <input
                type="number"
                min={0}
                step={100}
                value={minSearch}
                onChange={(e) => setMinSearch(Math.max(0, Number(e.target.value) || 0))}
                className="w-24 rounded-md border border-black/[.12] bg-transparent px-2 py-1 text-xs outline-none focus:border-black dark:border-white/[.16] dark:focus:border-white"
              />
              이상
            </label>
            {minSearch > 0 && (
              <button
                type="button"
                onClick={() => setMinSearch(0)}
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                초기화
              </button>
            )}

            <label
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
              title="검색량은 있는데 경쟁 문서가 적어 상위 노출이 비교적 쉬운 키워드 (경쟁도: 유리)"
            >
              <input
                type="checkbox"
                checked={goldenOnly}
                onChange={(e) => setGoldenOnly(e.target.checked)}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              🏆 황금 키워드만 보기
            </label>

            <span className="text-xs text-zinc-400">
              {filteredKeywords.length}개 표시 중 (전체 {keywords.length}개)
            </span>
          </div>

          {filteredKeywords.length === 0 ? (
            <p className="rounded-lg border border-black/[.08] p-4 text-sm text-zinc-400 dark:border-white/[.12]">
              조건을 만족하는 대표 키워드가 없습니다. {goldenOnly && "황금 키워드 필터를 끄거나, "}
              최소 검색량을 낮추거나 다른 조건을 선택해보세요.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.12]">
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/[.08] text-left text-xs text-zinc-500 dark:border-white/[.12]">
                      <th className="px-4 py-2 font-medium">키워드</th>
                      <th className="px-4 py-2 text-right font-medium">등장빈도</th>
                      <th className="px-4 py-2 text-right font-medium">PC</th>
                      <th className="px-4 py-2 text-right font-medium">모바일</th>
                      <th className="px-4 py-2 text-right font-medium">합계 검색량</th>
                      <th className="px-4 py-2 text-right font-medium">문서수</th>
                      <th className="px-4 py-2 text-right font-medium">경쟁도</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKeywords.map((k) => {
                      const pending = k.totalSearch === null;
                      return (
                        <tr
                          key={k.keyword}
                          className="border-b border-black/[.05] last:border-b-0 dark:border-white/[.06]"
                        >
                          <td className="px-4 py-2.5 font-medium">
                            <span
                              className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                k.source === "llm"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                              }`}
                            >
                              {k.source === "llm" ? "LLM 후보" : "수집"}
                            </span>
                            {k.keyword}
                          </td>
                          <td className="px-4 py-2.5 text-right text-zinc-500">{k.freq ?? "—"}</td>
                          {pending ? (
                            <td colSpan={3} className="px-4 py-2.5 text-center text-xs text-zinc-400">
                              검색량 검증 대기 중
                            </td>
                          ) : (
                            <>
                              <td className="px-4 py-2.5 text-right text-zinc-500">
                                {numberFormat.format(k.pcCount ?? 0)}
                              </td>
                              <td className="px-4 py-2.5 text-right text-zinc-500">
                                {numberFormat.format(k.mobileCount ?? 0)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium">
                                {numberFormat.format(k.totalSearch ?? 0)}
                              </td>
                            </>
                          )}
                          <td className="px-4 py-2.5 text-right text-zinc-500">
                            {k.docCount !== null ? numberFormat.format(k.docCount) : "-"}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold ${competitionColor(k.competition)}`}>
                            {pending ? "확인 전" : (k.competition ?? "-")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="flex flex-col divide-y divide-black/[.05] sm:hidden dark:divide-white/[.06]">
                {filteredKeywords.map((k) => {
                  const pending = k.totalSearch === null;
                  return (
                    <li key={k.keyword} className="flex flex-col gap-1.5 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          <span
                            className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              k.source === "llm"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {k.source === "llm" ? "LLM 후보" : "수집"}
                          </span>
                          {k.keyword}
                        </span>
                        <span className={`text-xs font-semibold ${competitionColor(k.competition)}`}>
                          {pending ? "확인 전" : (k.competition ?? "-")}
                        </span>
                      </div>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                        {pending ? (
                          <span>검색량 검증 대기 중</span>
                        ) : (
                          <span>검색량 {numberFormat.format(k.totalSearch ?? 0)}</span>
                        )}
                        <span>문서수 {k.docCount !== null ? numberFormat.format(k.docCount) : "-"}</span>
                        <span>빈도 {k.freq ?? "—"}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
