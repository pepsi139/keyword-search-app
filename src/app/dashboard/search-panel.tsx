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
  blogCount: number | null;
};

function StatIcon({ variant }: { variant: "pc" | "mobile" | "sum" | "blog" | "google" }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;
  if (variant === "pc")
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    );
  if (variant === "mobile")
    return (
      <svg {...common}>
        <rect x="7" y="3" width="10" height="18" rx="1.5" />
        <path d="M11 18h2" />
      </svg>
    );
  if (variant === "sum")
    return (
      <svg {...common}>
        <path d="M6 5h12l-6 7 6 7H6l6-7-6-7z" />
      </svg>
    );
  if (variant === "blog")
    return (
      <svg {...common}>
        <path d="M4 4h16v16H4z" />
        <path d="M8 9h8M8 13h8M8 17h4" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
}: {
  icon: "pc" | "mobile" | "sum" | "blog" | "google";
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color}`}>
        <StatIcon variant={icon} />
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
    </div>
  );
}

const PERIODS = [
  { id: "day", label: "일간" },
  { id: "week", label: "주간" },
  { id: "month", label: "월간" },
  { id: "year", label: "년간" },
];

const numberFormat = new Intl.NumberFormat("ko-KR");

function getCompetitionLevel(blogCount: number | null, totalSearch: number) {
  if (blogCount === null || totalSearch <= 0) return null;
  const ratio = blogCount / totalSearch;
  if (ratio < 30) return { label: "낮음", color: "text-emerald-600 dark:text-emerald-400" };
  if (ratio < 150) return { label: "보통", color: "text-amber-600 dark:text-amber-400" };
  return { label: "높음", color: "text-red-600 dark:text-red-400" };
}

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

  const [momChange, setMomChange] = useState<number | null>(null);

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

  async function fetchMomChange(term: string) {
    setMomChange(null);
    try {
      const res = await fetch("/api/trend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: term, period: "month" }),
      });
      const data = await res.json();
      const series: TrendPoint[] | undefined = res.ok ? data.naver : undefined;
      if (series && series.length >= 2) {
        const prev = series[series.length - 2].ratio;
        const last = series[series.length - 1].ratio;
        if (prev > 0) {
          setMomChange(((last - prev) / prev) * 100);
        }
      }
    } catch {
      // 조용히 무시 — 지난달 대비는 부가 정보라 실패해도 화면을 막지 않음
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
        fetchMomChange(term);
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
      <div className="relative overflow-hidden rounded-2xl bg-zinc-950 px-6 py-14 text-center sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col items-center">
          <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
            네이버·구글·유튜브를 한 번에 보는
            <br />
            가장 쉬운{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              키워드 데이터 분석 툴
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-zinc-400 sm:text-base">
            실시간 검색 트렌드로{" "}
            <span className="font-medium text-zinc-200">검색량·경쟁 강도·인기 이슈</span>
            를 한눈에 파악하고, 콘텐츠 아이디어를 빠르게 찾아보세요.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 w-full max-w-xl">
            <div className="flex items-center gap-2 rounded-full bg-white py-2 pl-6 pr-2 shadow-lg">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="분석할 키워드를 입력하세요"
                className="flex-1 bg-transparent text-sm text-black outline-none placeholder:text-zinc-400 sm:text-base"
              />
              <button
                type="submit"
                disabled={loading}
                aria-label="검색"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading ? (
                  <span className="text-xs">···</span>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-amber-400">🔥 실시간 인기 키워드</span>
            {trendingLoading ? (
              <span className="text-sm text-zinc-500">불러오는 중...</span>
            ) : trendingError ? (
              <span className="text-sm text-zinc-500">{trendingError}</span>
            ) : (
              trendingKeywords.slice(0, 5).map((tk) => (
                <button
                  key={tk.keyword}
                  type="button"
                  onClick={() => handleRelatedClick(tk.keyword)}
                  className="rounded-full border border-white/[.15] bg-white/[.06] px-3 py-1 text-xs text-zinc-200 transition-colors hover:bg-white/[.12]"
                >
                  #{tk.keyword}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {result && (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex flex-1 flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
                <h3 className="mb-4 text-sm font-semibold text-zinc-500">
                  월간 검색량
                </h3>
                {result.naver ? (
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard
                      icon="pc"
                      color="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                      label="PC"
                      value={numberFormat.format(result.naver.pcCount)}
                    />
                    <StatCard
                      icon="mobile"
                      color="bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400"
                      label="모바일"
                      value={numberFormat.format(result.naver.mobileCount)}
                    />
                    <StatCard
                      icon="sum"
                      color="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      label="합계"
                      value={numberFormat.format(
                        result.naver.pcCount + result.naver.mobileCount,
                      )}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">
                    {result.naverError ? "조회 실패" : "데이터 없음"}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
                <h3 className="mb-4 text-sm font-semibold text-zinc-500">
                  월간 콘텐츠 발행량 / 구글 검색량
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon="blog"
                    color="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    label="블로그"
                    value={
                      result.blogCount !== null
                        ? numberFormat.format(result.blogCount)
                        : "조회 실패"
                    }
                  />
                  <StatCard
                    icon="google"
                    color="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                    label="구글 월평균"
                    value={
                      result.google
                        ? numberFormat.format(result.google.avgMonthlySearches)
                        : "승인 심사중"
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
                <h3 className="mb-2 text-sm font-semibold text-zinc-500">지난달 대비</h3>
                {momChange === null ? (
                  <p className="text-sm text-zinc-400">계산 중이거나 데이터 부족</p>
                ) : (
                  <p
                    className={`text-lg font-bold ${
                      momChange >= 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {momChange >= 0 ? "+" : ""}
                    {momChange.toFixed(1)}%
                  </p>
                )}
                <p className="mt-1 text-xs text-zinc-400">
                  네이버 상대 관심도 기준 (절대 검색량 변화율과는 다를 수 있음)
                </p>
              </div>

              <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
                <h3 className="mb-2 text-sm font-semibold text-zinc-500">경쟁도</h3>
                {(() => {
                  const level = result.naver
                    ? getCompetitionLevel(
                        result.blogCount,
                        result.naver.pcCount + result.naver.mobileCount,
                      )
                    : null;
                  return level ? (
                    <p className={`text-lg font-bold ${level.color}`}>{level.label}</p>
                  ) : (
                    <p className="text-sm text-zinc-400">데이터 부족</p>
                  );
                })()}
                <p className="mt-1 text-xs text-zinc-400">
                  블로그 발행량 대비 검색량 기준 콘텐츠 포화도 (광고 경쟁도 아님)
                </p>
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

              <div
                className="flex flex-col gap-4"
                style={{
                  opacity: trendLoading ? 0.5 : 1,
                  transition: "opacity 0.25s ease",
                }}
              >
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
            </div>

            <div className="overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.12]">
              <h3 className="border-b border-black/[.08] px-4 py-3 text-sm font-semibold text-zinc-500 dark:border-white/[.12]">
                연관 키워드{" "}
                {result.naver && (
                  <span className="font-normal text-zinc-400">
                    ({result.naver.relatedKeywords.length}개)
                  </span>
                )}
              </h3>
              {result.naver && result.naver.relatedKeywords.length > 0 ? (
                <>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-black/[.08] text-left text-xs text-zinc-500 dark:border-white/[.12]">
                          <th className="px-4 py-2 font-medium">키워드</th>
                          <th className="px-4 py-2 text-right font-medium">PC</th>
                          <th className="px-4 py-2 text-right font-medium">모바일</th>
                          <th className="px-4 py-2 text-right font-medium">합계</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.naver.relatedKeywords.map((rk) => (
                          <tr
                            key={rk.keyword}
                            onClick={() => handleRelatedClick(rk.keyword)}
                            className="cursor-pointer border-b border-black/[.05] last:border-b-0 hover:bg-black/[.03] dark:border-white/[.06] dark:hover:bg-white/[.04]"
                          >
                            <td className="px-4 py-2.5 font-medium">{rk.keyword}</td>
                            <td className="px-4 py-2.5 text-right text-zinc-500">
                              {numberFormat.format(rk.pcCount)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-zinc-500">
                              {numberFormat.format(rk.mobileCount)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium">
                              {numberFormat.format(rk.pcCount + rk.mobileCount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <ul className="flex flex-col divide-y divide-black/[.05] sm:hidden dark:divide-white/[.06]">
                    {result.naver.relatedKeywords.map((rk) => (
                      <li key={rk.keyword}>
                        <button
                          type="button"
                          onClick={() => handleRelatedClick(rk.keyword)}
                          className="flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-black/[.03] dark:hover:bg-white/[.04]"
                        >
                          <span className="font-medium">{rk.keyword}</span>
                          <span className="flex items-center gap-3 text-xs text-zinc-500">
                            <span>PC {numberFormat.format(rk.pcCount)}</span>
                            <span>모바일 {numberFormat.format(rk.mobileCount)}</span>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              합계 {numberFormat.format(rk.pcCount + rk.mobileCount)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="px-4 py-4 text-sm text-zinc-400">연관 검색어 없음</p>
              )}
            </div>

            <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
              <h3 className="mb-3 text-sm font-semibold text-zinc-500">
                추천 키워드 (유튜브 인기 검색 기준)
              </h3>
              {suggestLoading ? (
                <p className="text-sm text-zinc-400">불러오는 중...</p>
              ) : suggestions && suggestions.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {suggestions.slice(0, 3).map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => handleRelatedClick(s)}
                        className="flex items-center gap-2 text-left text-sm transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <span className="text-emerald-500">✓</span>
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-400">데이터 없음</p>
              )}
            </div>
          </div>

          <KeywordSidebar
            suggestions={suggestions}
            suggestLoading={suggestLoading}
            relatedKeywords={[]}
            onSelect={handleRelatedClick}
            showRelated={false}
          />
        </div>
      )}
    </div>
  );
}
