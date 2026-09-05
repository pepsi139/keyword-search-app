"use client";

import { useState } from "react";
import { DIRECTORY_GROUPS } from "@/lib/naver-directory";
import type { CategoryKeyword } from "@/app/api/category-keywords/route";

type ResultData = {
  topic: { seq: number; name: string };
  postCount: number;
  generatedAt: string;
  keywords: CategoryKeyword[];
};

type SortKey = "score" | "search" | "freq" | "competition";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "score", label: "추천순" },
  { id: "search", label: "검색량순" },
  { id: "freq", label: "등장빈도순" },
  { id: "competition", label: "경쟁도순" },
];

const COMPETITION_RANK: Record<string, number> = { 유리: 0, 보통: 1, 포화: 2 };

const numberFormat = new Intl.NumberFormat("ko-KR");

function competitionColor(level: CategoryKeyword["competition"]) {
  if (level === "유리") return "text-emerald-600 dark:text-emerald-400";
  if (level === "보통") return "text-amber-600 dark:text-amber-400";
  if (level === "포화") return "text-red-600 dark:text-red-400";
  return "text-zinc-400";
}

function downloadCsv(topicName: string, keywords: CategoryKeyword[]) {
  const header = ["키워드", "등장빈도", "PC검색량", "모바일검색량", "합계검색량", "문서수", "경쟁도"];
  const rows = keywords.map((k) => [
    k.keyword,
    k.freq,
    k.pcCount,
    k.mobileCount,
    k.totalSearch,
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
  a.download = `카테고리키워드_${topicName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CategoryKeywordPanel() {
  const [groupSeq, setGroupSeq] = useState<number | null>(null);
  const [subGroupName, setSubGroupName] = useState<string | null>(null);
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("score");

  const selectedGroup = DIRECTORY_GROUPS.find((g) => g.seq === groupSeq) ?? null;
  const selectedSubGroup = selectedGroup?.subGroups.find((s) => s.name === subGroupName) ?? null;

  function handleGroupChange(value: string) {
    setGroupSeq(value ? Number(value) : null);
    setSubGroupName(null);
    setSelectedSeq(null);
    setResult(null);
    setError(null);
  }

  function handleSubGroupChange(value: string) {
    setSubGroupName(value || null);
    setSelectedSeq(null);
    setResult(null);
    setError(null);
  }

  async function handleTopicChange(value: string) {
    const seq = value ? Number(value) : null;
    setSelectedSeq(seq);
    if (seq === null) {
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/category-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directorySeq: seq }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "조회 중 오류가 발생했습니다.");
      } else {
        setResult(data);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const sortedKeywords = result
    ? [...result.keywords].sort((a, b) => {
        if (sortKey === "search") return b.totalSearch - a.totalSearch;
        if (sortKey === "freq") return b.freq - a.freq;
        if (sortKey === "competition") {
          const ra = a.competition ? COMPETITION_RANK[a.competition] : 99;
          const rb = b.competition ? COMPETITION_RANK[b.competition] : 99;
          return ra - rb;
        }
        return b.freq * Math.log(b.totalSearch + 1) - a.freq * Math.log(a.totalSearch + 1);
      })
    : [];

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500">대분류</span>
          <select
            value={groupSeq ?? ""}
            onChange={(e) => handleGroupChange(e.target.value)}
            disabled={loading}
            className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-black disabled:opacity-50 dark:border-white/[.16] dark:focus:border-white"
          >
            <option value="">선택하세요</option>
            {DIRECTORY_GROUPS.map((group) => (
              <option key={group.seq} value={group.seq}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500">중분류</span>
          <select
            value={subGroupName ?? ""}
            onChange={(e) => handleSubGroupChange(e.target.value)}
            disabled={loading || !selectedGroup}
            className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-black disabled:opacity-50 dark:border-white/[.16] dark:focus:border-white"
          >
            <option value="">선택하세요</option>
            {selectedGroup?.subGroups.map((sub) => (
              <option key={sub.name} value={sub.name}>
                {sub.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-500">소분류 (주제)</span>
          <select
            value={selectedSeq ?? ""}
            onChange={(e) => handleTopicChange(e.target.value)}
            disabled={loading || !selectedSubGroup}
            className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-black disabled:opacity-50 dark:border-white/[.16] dark:focus:border-white"
          >
            <option value="">선택하세요</option>
            {selectedSubGroup?.topics.map((topic) => (
              <option key={topic.seq} value={topic.seq}>
                {topic.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading && (
        <div className="flex flex-col gap-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-md bg-black/[.04] dark:bg-white/[.06]"
            />
          ))}
        </div>
      )}

      {result && !loading && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">
                {result.topic.name}{" "}
                <span className="text-sm font-normal text-zinc-400">
                  대표 키워드 {result.keywords.length}개 (수집 글 {result.postCount}건 분석)
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                생성 시각 {new Date(result.generatedAt).toLocaleString("ko-KR")} · 빈도 기반 실시간
                산출 (배치 누적 데이터 아님)
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadCsv(result.topic.name, sortedKeywords)}
              disabled={sortedKeywords.length === 0}
              className="rounded-md border border-black/[.12] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.16] dark:hover:bg-white/[.06]"
            >
              CSV 다운로드
            </button>
          </div>

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

          {sortedKeywords.length === 0 ? (
            <p className="rounded-lg border border-black/[.08] p-4 text-sm text-zinc-400 dark:border-white/[.12]">
              검색량 기준을 만족하는 대표 키워드를 찾지 못했습니다. 다른 주제를 선택해보세요.
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
                    {sortedKeywords.map((k) => (
                      <tr
                        key={k.keyword}
                        className="border-b border-black/[.05] last:border-b-0 dark:border-white/[.06]"
                      >
                        <td className="px-4 py-2.5 font-medium">{k.keyword}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-500">{k.freq}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-500">
                          {numberFormat.format(k.pcCount)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-zinc-500">
                          {numberFormat.format(k.mobileCount)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium">
                          {numberFormat.format(k.totalSearch)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-zinc-500">
                          {k.docCount !== null ? numberFormat.format(k.docCount) : "-"}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${competitionColor(k.competition)}`}>
                          {k.competition ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="flex flex-col divide-y divide-black/[.05] sm:hidden dark:divide-white/[.06]">
                {sortedKeywords.map((k) => (
                  <li key={k.keyword} className="flex flex-col gap-1.5 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{k.keyword}</span>
                      <span className={`text-xs font-semibold ${competitionColor(k.competition)}`}>
                        {k.competition ?? "-"}
                      </span>
                    </div>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                      <span>검색량 {numberFormat.format(k.totalSearch)}</span>
                      <span>문서수 {k.docCount !== null ? numberFormat.format(k.docCount) : "-"}</span>
                      <span>빈도 {k.freq}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
