"use client";

import { useState } from "react";

type SearchResult = {
  keyword: string;
  naver: { pcCount: number; mobileCount: number } | null;
  naverError: string | null;
  google: { avgMonthlySearches: number } | null;
};

const numberFormat = new Intl.NumberFormat("ko-KR");

export function SearchPanel() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "검색 중 오류가 발생했습니다.");
        setResult(null);
      } else {
        setResult(data);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="검색할 키워드를 입력하세요"
          className="flex-1 rounded-md border border-black/[.12] bg-transparent px-4 py-2.5 text-sm outline-none focus:border-black dark:border-white/[.16] dark:focus:border-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {loading ? "검색 중..." : "검색"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {result && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
            <h3 className="mb-3 text-sm font-semibold text-zinc-500">
              네이버 월간 검색량
            </h3>
            {result.naver ? (
              <dl className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">PC</dt>
                  <dd className="font-medium">
                    {numberFormat.format(result.naver.pcCount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">모바일</dt>
                  <dd className="font-medium">
                    {numberFormat.format(result.naver.mobileCount)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-zinc-400">
                {result.naverError ? "조회 실패" : "데이터 없음"}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
            <h3 className="mb-3 text-sm font-semibold text-zinc-500">
              구글 월평균 검색량
            </h3>
            {result.google ? (
              <p className="text-sm font-medium">
                {numberFormat.format(result.google.avgMonthlySearches)}
              </p>
            ) : (
              <p className="text-sm text-zinc-400">Google Ads 승인 심사중</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
