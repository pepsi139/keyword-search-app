"use client";

import { useState } from "react";

type YoutubeResult = {
  keyword: string;
  youtube: {
    totalViews: number;
    videos: { title: string; viewCount: number }[];
  };
};

const numberFormat = new Intl.NumberFormat("ko-KR");

export function YoutubeSearchPanel() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<YoutubeResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/youtube-search", {
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
        <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
          <h3 className="mb-3 text-sm font-semibold text-zinc-500">
            유튜브 상위 영상 조회수
          </h3>
          {result.youtube.videos.length > 0 ? (
            <div className="flex flex-col gap-3 text-sm">
              <p className="font-medium">
                합계 {numberFormat.format(result.youtube.totalViews)}
              </p>
              <ul className="flex flex-col gap-2">
                {result.youtube.videos.map((v, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-4 border-t border-black/[.06] pt-2 first:border-t-0 first:pt-0 dark:border-white/[.08]"
                  >
                    <span className="truncate text-zinc-700 dark:text-zinc-300">
                      {v.title}
                    </span>
                    <span className="shrink-0 font-medium">
                      {numberFormat.format(v.viewCount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">데이터 없음</p>
          )}
        </div>
      )}
    </div>
  );
}
