"use client";

import { useState } from "react";
import Link from "next/link";

type SearchResult = {
  keyword: string;
  naver: { pcCount: number; mobileCount: number } | null;
  naverError: string | null;
  google: { avgMonthlySearches: number } | null;
  googleError: string | null;
  docCounts: { blog: number | null };
  freeSearchesLeft: number | null;
};

const numberFormat = new Intl.NumberFormat("ko-KR");
const FREE_SEARCH_LIMIT = 5;

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    setLimitReached(false);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "검색 중 오류가 발생했습니다.");
        setLimitReached(Boolean(data.limitReached));
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
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <nav className="flex items-center justify-between border-b border-black/[.08] px-6 py-3 dark:border-white/[.12]">
        <div className="flex items-center gap-2">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="text-blue-600 dark:text-blue-400"
          >
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          </svg>
          <span className="text-lg font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
            Keyword
            <span className="text-blue-600 dark:text-blue-400">Radar</span>
            <span className="text-zinc-900 dark:text-zinc-50"> (키워드</span>
            <span className="text-blue-600 dark:text-blue-400">레이더</span>
            <span className="text-zinc-900 dark:text-zinc-50">)</span>
          </span>
        </div>
        <Link
          href="/login"
          className="rounded-md border border-black/[.12] px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.04] dark:border-white/[.16] dark:text-zinc-200 dark:hover:bg-white/[.06]"
        >
          로그인
        </Link>
      </nav>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            네이버·구글·유튜브를 한 번에 보는
            <br />
            가장 쉬운{" "}
            <span className="text-blue-600 dark:text-blue-400">키워드 데이터 분석 툴</span>
          </h1>
          <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
            네이버, 구글, 유튜브의 키워드 검색량과 조회수를 한 화면에서 비교해주는 마케팅
            리서치용 웹 서비스입니다. 콘텐츠 기획과 광고 키워드 선정을 돕기 위해 개인 프로젝트로
            개발 중입니다.
          </p>

          <form onSubmit={handleSubmit} className="mt-2 w-full max-w-xl">
            <div className="flex items-center gap-2 rounded-full border border-black/[.12] bg-white py-2 pl-6 pr-2 shadow-sm dark:border-white/[.16] dark:bg-zinc-900">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              로그인 없이 {FREE_SEARCH_LIMIT}회까지 무료로 검색해보실 수 있습니다.
            </p>
          </form>

          {error && (
            <div className="w-full max-w-xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <p>{error}</p>
              {limitReached && (
                <Link
                  href="/login"
                  className="mt-2 inline-block rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  로그인하고 계속 이용하기
                </Link>
              )}
            </div>
          )}

          {result && (
            <div className="w-full max-w-xl rounded-lg border border-black/[.08] p-5 text-left dark:border-white/[.12]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-500">
                  &quot;{result.keyword}&quot; 검색 결과
                </h2>
                {result.freeSearchesLeft !== null && (
                  <span className="text-xs text-zinc-400">
                    무료 검색 {result.freeSearchesLeft}/{FREE_SEARCH_LIMIT}회 남음
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-zinc-500">네이버 PC</p>
                  <p className="text-lg font-bold">
                    {result.naver ? numberFormat.format(result.naver.pcCount) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">네이버 모바일</p>
                  <p className="text-lg font-bold">
                    {result.naver ? numberFormat.format(result.naver.mobileCount) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">구글 월평균</p>
                  <p className="text-lg font-bold">
                    {result.google ? numberFormat.format(result.google.avgMonthlySearches) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">블로그 문서수</p>
                  <p className="text-lg font-bold">
                    {result.docCounts.blog !== null ? numberFormat.format(result.docCounts.blog) : "-"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-zinc-400">
                연관 키워드, 검색 추이, 경쟁도 등 더 자세한 분석은{" "}
                <Link href="/login" className="underline">
                  로그인
                </Link>{" "}
                후 이용하실 수 있습니다.
              </p>
            </div>
          )}

          <Link
            href="/privacy"
            className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            개인정보처리방침
          </Link>
        </div>
      </main>
    </div>
  );
}
