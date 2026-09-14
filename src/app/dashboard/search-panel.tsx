"use client";

import { useEffect, useState } from "react";
import { TrendChart } from "./trend-chart";
import { KeywordSidebar } from "./keyword-sidebar";
import type { DocCounts } from "@/lib/naver-docs";
import type { Competition, CompetitionGrade } from "@/lib/competition";
import type { SerpResult } from "@/lib/naver-serp";
import type { GoldenScore, GoldenGrade } from "@/lib/golden";

type TrendingKeyword = { keyword: string; count: number };

const RECENT_SEARCHES_KEY = "kr_keyword_recent_searches";

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  try {
    const current = loadRecentSearches().filter((t) => t !== term);
    const next = [term, ...current].slice(0, 6);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

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
  googleError: string | null;
  docCounts: DocCounts;
  competition: Competition | null;
  serp: SerpResult | null;
  serpError: string | null;
  golden: GoldenScore | null;
};

type IconVariant = "pc" | "mobile" | "sum" | "blog" | "google" | "cafe" | "kin" | "web";

function StatIcon({ variant }: { variant: IconVariant }) {
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
  if (variant === "cafe")
    return (
      <svg {...common}>
        <path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" />
        <path d="M16 10h2a2 2 0 0 1 0 4h-2M6 4v2M10 4v2" />
      </svg>
    );
  if (variant === "kin")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5M12 17h.01" />
      </svg>
    );
  if (variant === "web")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
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
  icon: IconVariant;
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

function kinToolLink(baseUrl: string | null, keyword: string) {
  if (!baseUrl) return null;
  const url = new URL(baseUrl);
  url.searchParams.set("q", keyword);
  return url.toString();
}

const GRADE_ORDER: CompetitionGrade[] = ["golden", "low", "medium", "high", "saturated"];
const GRADE_STYLE: Record<CompetitionGrade, { text: string; bar: string }> = {
  golden: { text: "text-yellow-600 dark:text-yellow-400", bar: "bg-yellow-400" },
  low: { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  medium: { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  high: { text: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500" },
  saturated: { text: "text-red-600 dark:text-red-400", bar: "bg-red-500" },
};

function formatDocCount(value: number | null) {
  return value === null ? "-" : numberFormat.format(value);
}

const GOLDEN_STYLE: Record<GoldenGrade, { text: string; ring: string }> = {
  golden: { text: "text-yellow-600 dark:text-yellow-400", ring: "border-yellow-400" },
  good: { text: "text-emerald-600 dark:text-emerald-400", ring: "border-emerald-500" },
  normal: { text: "text-amber-600 dark:text-amber-400", ring: "border-amber-500" },
  hard: { text: "text-red-600 dark:text-red-400", ring: "border-red-500" },
};

function GoldenCard({
  golden,
  keyword,
  kinToolUrl,
}: {
  golden: GoldenScore | null;
  keyword: string;
  kinToolUrl: string | null;
}) {
  const kinLink = kinToolLink(kinToolUrl, keyword);
  const actionButton = kinLink && (
    <a
      href={kinLink}
      target="_blank"
      rel="noopener"
      className="mt-2 inline-flex w-fit items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
    >
      이 키워드로 지식iN 질문 수집 ↗
    </a>
  );

  if (!golden) {
    return (
      <div className="flex flex-col">
        <p className="text-sm text-zinc-400">검색량 또는 문서수가 없어 계산할 수 없습니다</p>
        {actionButton}
      </div>
    );
  }
  const style = GOLDEN_STYLE[golden.grade];
  return (
    <div className="flex items-start gap-4">
      <div
        className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-4 ${style.ring}`}
      >
        <span className={`text-xl font-bold leading-none ${style.text}`}>{golden.score}</span>
        <span className="mt-0.5 text-[10px] text-zinc-500">/ 100</span>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className={`text-lg font-bold ${style.text}`}>{golden.label}</p>
        <p className="text-xs text-zinc-500">{golden.reason}</p>
        <div className="mt-1 flex gap-3 text-[11px] text-zinc-400">
          <span>검색량 {golden.parts.volume}</span>
          <span>경쟁 {golden.parts.competition}</span>
          <span>섹션 {golden.parts.section}</span>
        </div>
        {actionButton}
      </div>
    </div>
  );
}

function SerpOrderCard({ serp, error }: { serp: SerpResult | null; error: string | null }) {
  if (!serp) {
    return (
      <p className="text-sm text-zinc-400">
        {error ? "통합검색 섹션을 가져오지 못했습니다" : "데이터 없음"}
      </p>
    );
  }
  return (
    <>
      <ol className="flex flex-wrap items-center gap-1.5">
        {serp.sections.map((s, i) => {
          const isBlog = s.type === "blog" || s.type === "popular_posts";
          const cls = isBlog
            ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
            : s.isAd
              ? "border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-600"
              : "border-black/[.1] text-zinc-600 dark:border-white/[.16] dark:text-zinc-300";
          return (
            <li key={s.type} className="flex items-center gap-1.5">
              <span className={`rounded-full border px-2.5 py-0.5 text-xs ${cls}`}>
                {i + 1}. {s.label}
              </span>
              {i < serp.sections.length - 1 && <span className="text-zinc-300 dark:text-zinc-600">›</span>}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-zinc-400">
        {serp.blogRank
          ? `블로그 섹션이 ${serp.blogRank}번째 (광고 제외 ${serp.blogOrganicRank}번째)에 노출됩니다`
          : "통합검색 첫 화면에 블로그 섹션이 없습니다"}{" "}
        · 모바일 기준, 하루 1회 갱신
      </p>
    </>
  );
}

function CompetitionCard({ competition }: { competition: Competition | null }) {
  if (!competition) {
    return (
      <>
        <p className="text-sm text-zinc-400">데이터 부족</p>
        <p className="mt-1 text-xs text-zinc-400">검색량 또는 블로그 문서수를 가져오지 못했습니다</p>
      </>
    );
  }
  const style = GRADE_STYLE[competition.grade];
  const activeIndex = GRADE_ORDER.indexOf(competition.grade);
  return (
    <>
      <div className="flex items-baseline gap-2">
        <p className={`text-lg font-bold ${style.text}`}>{competition.label}</p>
        <span className="text-xs text-zinc-500">문서수 / 검색량 = {numberFormat.format(competition.ratio)}</span>
      </div>
      <div className="mt-2 flex gap-1">
        {GRADE_ORDER.map((g, i) => (
          <span
            key={g}
            className={`h-1.5 flex-1 rounded-full ${i <= activeIndex ? style.bar : "bg-black/[.08] dark:bg-white/[.12]"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-400">{competition.description}</p>
    </>
  );
}

export function SearchPanel({ kinToolUrl }: { kinToolUrl: string | null }) {
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

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

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
    setShowAutocomplete(false);

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
        setRecentSearches(saveRecentSearch(term));
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

  const autocompleteMatches = recentSearches.filter(
    (s) => keyword.trim() && s !== keyword.trim() && s.toLowerCase().includes(keyword.trim().toLowerCase()),
  );

  function handlePeriodClick(id: string) {
    setPeriod(id);
    if (result) fetchTrend(result.keyword, id);
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div className="rounded-2xl border border-black/[.08] px-6 py-14 text-center dark:border-white/[.12] sm:px-12 sm:py-16">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold leading-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            네이버·구글·유튜브를 한 번에 보는
            <br />
            가장 쉬운{" "}
            <span className="text-blue-600 dark:text-blue-400">키워드 데이터 분석 툴</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            실시간 검색 트렌드로{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">검색량·경쟁 강도·인기 이슈</span>
            를 한눈에 파악하고, 콘텐츠 아이디어를 빠르게 찾아보세요.
          </p>

          <form onSubmit={handleSubmit} className="relative mt-8 w-full max-w-xl">
            <div className="flex items-center gap-2 rounded-full border border-black/[.12] bg-white py-2 pl-6 pr-2 shadow-sm dark:border-white/[.16] dark:bg-zinc-900">
              <input
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setShowAutocomplete(true);
                }}
                onFocus={() => setShowAutocomplete(true)}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
                placeholder="분석할 키워드를 입력하세요"
                className="flex-1 bg-transparent text-sm text-black outline-none placeholder:text-zinc-400 dark:text-white sm:text-base"
              />
              <button
                type="submit"
                disabled={loading}
                aria-label="검색"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
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

            {showAutocomplete && autocompleteMatches.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-lg border border-black/[.08] bg-white text-left shadow-lg dark:border-white/[.12] dark:bg-zinc-900">
                {autocompleteMatches.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleRelatedClick(s)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[.06]"
                    >
                      <span className="text-zinc-400">🕑</span>
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>

          {recentSearches.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-zinc-500">최근 검색어</span>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleRelatedClick(s)}
                  className="rounded-full border border-black/[.12] px-3 py-1 text-xs text-zinc-600 transition-colors hover:bg-black/[.04] dark:border-white/[.16] dark:text-zinc-300 dark:hover:bg-white/[.06]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-amber-600 dark:text-amber-400">🔥 실시간 인기 키워드</span>
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
                  className="rounded-full border border-black/[.12] px-3 py-1 text-xs text-zinc-600 transition-colors hover:bg-black/[.04] dark:border-white/[.16] dark:text-zinc-300 dark:hover:bg-white/[.06]"
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
                <h3 className="mb-3 text-sm font-semibold text-zinc-500">황금지수</h3>
                <GoldenCard golden={result.golden} keyword={result.keyword} kinToolUrl={kinToolUrl} />
              </div>
              <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
                <h3 className="mb-3 text-sm font-semibold text-zinc-500">네이버 통합검색 노출 순서</h3>
                <SerpOrderCard serp={result.serp} error={result.serpError} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
                <h3 className="mb-4 text-sm font-semibold text-zinc-500">
                  월간 검색량
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon="pc"
                    color="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    label="네이버 PC"
                    value={result.naver ? numberFormat.format(result.naver.pcCount) : "-"}
                  />
                  <StatCard
                    icon="mobile"
                    color="bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400"
                    label="네이버 모바일"
                    value={result.naver ? numberFormat.format(result.naver.mobileCount) : "-"}
                  />
                  <StatCard
                    icon="sum"
                    color="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    label="네이버 합계"
                    value={
                      result.naver
                        ? numberFormat.format(result.naver.pcCount + result.naver.mobileCount)
                        : "-"
                    }
                  />
                  <StatCard
                    icon="google"
                    color="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                    label="구글 월평균"
                    value={result.google ? numberFormat.format(result.google.avgMonthlySearches) : "-"}
                  />
                </div>
                {result.naverError && (
                  <p className="mt-2 text-xs text-red-500">네이버 검색량 조회 실패</p>
                )}
              </div>

              <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
                <h3 className="mb-4 text-sm font-semibold text-zinc-500">누적 문서수</h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon="blog"
                    color="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    label="블로그"
                    value={formatDocCount(result.docCounts.blog)}
                  />
                  <StatCard
                    icon="cafe"
                    color="bg-lime-50 text-lime-600 dark:bg-lime-500/10 dark:text-lime-400"
                    label="카페"
                    value={formatDocCount(result.docCounts.cafe)}
                  />
                  <StatCard
                    icon="kin"
                    color="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                    label="지식iN"
                    value={formatDocCount(result.docCounts.kin)}
                  />
                  <StatCard
                    icon="web"
                    color="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
                    label="웹문서"
                    value={formatDocCount(result.docCounts.web)}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  네이버 검색 결과 기준 전체 문서수 (- 는 조회 불가)
                </p>
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
                <h3 className="mb-2 text-sm font-semibold text-zinc-500">블로그 경쟁강도</h3>
                <CompetitionCard competition={result.competition} />
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
