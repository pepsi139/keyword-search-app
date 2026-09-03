"use client";

import { useEffect, useState } from "react";
import { TrendChart } from "./trend-chart";
import { KeywordSidebar } from "./keyword-sidebar";

type TrendingKeyword = { keyword: string; count: number };

type RelatedKeyword = { keyword: string; pcCount: number; mobileCount: number };
type TrendPoint = { period: string; ratio: number };

type SearchResult = {
  keyword: string;
  naver: {
    pcCount: number;
    mobileCount: number;
    relatedKeywords: RelatedKeyword[];
  } | null;
  naverError: string | null;
  google: { avgMonthlySearches: number } | null;
};

const PERIODS = [
  { id: "day", label: "일간" },
  { id: "week", label: "주간" },
  { id: "month", label: "월간" },
  { id: "year", label: "년간" },
];

const numberFormat = new Intl.NumberFormat("ko-KR");

export function SearchPanel() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  const [period, setPeriod] = useState("month");
  const [naverTrend, setNaverTrend] = useState<TrendPoint[] | null>(null);
  const [googleTrend, setGoogleTrend] = useState<TrendPoint[] | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [googleTrendError, setGoogleTrendError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrendingKeywords() {
      try {
        const res = await fetch("/api/news-trending");
        const data = await res.json();
        if (res.ok) setTrendingKeywords(data.keywords);
        else setTrendingError(data.error ?? "조회 실패");
      } catch {
        setTrendingError("네트워크 오류가 발생했습니다.");
      } finally {
        setTrendingLoading(false);
      }
    }
    loadTrendingKeywords();
  }, []);

  async function fetchTrend(term: string, selectedPeriod: string) {
    setTrendLoading(true);
    setTrendError(null);
    setGoogleTrendError(null);
    try {
      const res = await fetch("/api/trend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: term, period: selectedPeriod }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTrendError(data.error ?? "추이 조회 중 오류가 발생했습니다.");
        setNaverTrend(null);
        setGoogleTrend(null);
      } else {
        setNaverTrend(data.naver);
        setGoogleTrend(data.google);
        if (data.naverError) setTrendError("네이버 추이 조회 실패");
        if (data.googleError) setGoogleTrendError("구글 트렌드 조회 실패 (비공식 API 제한일 수 있음)");
      }
    } catch {
      setTrendError("네트워크 오류가 발생했습니다.");
    } finally {
      setTrendLoading(false);
    }
  }

  async function fetchSuggestions(term: string) {
    setSuggestLoading(true);
    try {
      const res = await fetch("/api/youtube-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: term }),
      });
      const data = await res.json();
      if (res.ok) setSuggestions(data.suggestions);
      else setSuggestions(null);
    } catch {
      setSuggestions(null);
    } finally {
      setSuggestLoading(false);
    }
  }

  async function runSearch(term: string) {
    if (!term.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: term }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "검색 중 오류가 발생했습니다.");
        setResult(null);
      } else {
        setResult(data);
        fetchTrend(term, period);
        fetchSuggestions(term);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(keyword);
  }

  function handleRelatedClick(term: string) {
    setKeyword(term);
    runSearch(term);
  }

  function handlePeriodClick(id: string) {
    setPeriod(id);
    if (result) fetchTrend(result.keyword, id);
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
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

      <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
        <h3 className="mb-3 text-sm font-semibold text-zinc-500">
          실시간 인기 키워드 (뉴스 기반)
        </h3>
        {trendingLoading ? (
          <p className="text-sm text-zinc-400">불러오는 중...</p>
        ) : trendingError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{trendingError}</p>
        ) : trendingKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {trendingKeywords.map((tk, i) => (
              <button
                key={tk.keyword}
                type="button"
                onClick={() => handleRelatedClick(tk.keyword)}
                className="rounded-full border border-black/[.12] px-3 py-1 text-xs transition-colors hover:bg-black/[.04] dark:border-white/[.16] dark:hover:bg-white/[.06]"
              >
                {i + 1}. {tk.keyword}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">데이터 없음</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {result && (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex flex-1 flex-col gap-4">
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

            <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-500">
                  검색 관심도 추이 (상대값)
                </h3>
                <div className="flex gap-1">
                  {PERIODS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePeriodClick(p.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        period === p.id
                          ? "bg-black/[.06] text-black dark:bg-white/[.1] dark:text-white"
                          : "text-zinc-500 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/[.06]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {trendLoading ? (
                <p className="text-sm text-zinc-400">불러오는 중...</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-1 text-xs text-zinc-500">네이버</p>
                    {trendError ? (
                      <p className="text-sm text-red-600 dark:text-red-400">{trendError}</p>
                    ) : (
                      <TrendChart data={naverTrend ?? []} />
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-zinc-500">구글 (비공식, 불안정할 수 있음)</p>
                    {googleTrendError ? (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {googleTrendError}
                      </p>
                    ) : (
                      <TrendChart data={googleTrend ?? []} />
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

          <KeywordSidebar
            suggestions={suggestions}
            suggestLoading={suggestLoading}
            relatedKeywords={result.naver?.relatedKeywords ?? []}
            onSelect={handleRelatedClick}
          />
        </div>
      )}
    </div>
  );
}
