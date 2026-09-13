"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/login");
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
            개발 중이며, 현재는 초기 개발 단계입니다.
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
                aria-label="검색"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              검색하려면 로그인이 필요합니다 — 입력 후 검색을 누르면 로그인 화면으로 이동합니다.
            </p>
          </form>

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
