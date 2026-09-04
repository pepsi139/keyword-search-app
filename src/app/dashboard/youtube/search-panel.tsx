"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KeywordSidebar } from "../keyword-sidebar";
import { VideoCard, type Video } from "./video-card";
import { VideoCardSkeleton } from "./video-card-skeleton";

const RECENT_SEARCHES_KEY = "kr_youtube_recent_searches";
const EXAMPLE_KEYWORDS = ["캠핑용품", "다이어트", "노트북 추천", "에어컨", "홈트레이닝"];

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

function downloadVideosCsv(keyword: string, videos: { title: string; channelTitle: string; subscriberCount: number; publishedAt: string; viewCount: number; likeCount: number; commentCount: number }[]) {
  const header = ["제목", "채널", "구독자수", "업로드일", "조회수", "좋아요", "댓글수"];
  const rows = videos.map((v) => [
    v.title,
    v.channelTitle,
    v.subscriberCount,
    v.publishedAt.slice(0, 10),
    v.viewCount,
    v.likeCount,
    v.commentCount,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `youtube_${keyword}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type YoutubeResult = {
  keyword: string;
  youtube: {
    totalViews: number;
    topVideos: Video[];
    latestVideos: Video[];
  };
};

type RelatedKeyword = { keyword: string; pcCount: number; mobileCount: number };

type WatchRow = {
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string;
};

const numberFormat = new Intl.NumberFormat("ko-KR");

export function YoutubeSearchPanel() {
  const supabase = createClient();
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<YoutubeResult | null>(null);
  const [watchList, setWatchList] = useState<WatchRow[]>([]);
  const watched = new Set(watchList.map((w) => w.video_id));

  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [relatedKeywords, setRelatedKeywords] = useState<RelatedKeyword[]>([]);

  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState<string | null>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  async function loadWatches() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("video_watches")
      .select("video_id, title, channel_title, thumbnail_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setWatchList(data as WatchRow[]);
  }

  useEffect(() => {
    loadWatches();

    async function loadTrending() {
      try {
        const res = await fetch("/api/youtube-trending");
        const data = await res.json();
        if (res.ok) setTrendingVideos(data.videos);
        else setTrendingError(data.error ?? "조회 실패");
      } catch {
        setTrendingError("네트워크 오류가 발생했습니다.");
      } finally {
        setTrendingLoading(false);
      }
    }
    loadTrending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchSuggestions(term: string) {
    setSuggestLoading(true);
    try {
      const res = await fetch("/api/youtube-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: term }),
      });
      const data = await res.json();
      setSuggestions(res.ok ? data.suggestions : null);
    } catch {
      setSuggestions(null);
    } finally {
      setSuggestLoading(false);
    }
  }

  async function fetchRelated(term: string) {
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: term }),
      });
      const data = await res.json();
      setRelatedKeywords(res.ok ? data.naver?.relatedKeywords ?? [] : []);
    } catch {
      setRelatedKeywords([]);
    }
  }

  async function runSearch(term: string) {
    if (!term.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/youtube-search", {
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
        fetchSuggestions(term);
        fetchRelated(term);
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

  function handleSidebarSelect(term: string) {
    setKeyword(term);
    runSearch(term);
  }

  async function toggleWatch(video: Video) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const isWatched = watched.has(video.videoId);

    if (isWatched) {
      await supabase
        .from("video_watches")
        .delete()
        .eq("user_id", user.id)
        .eq("video_id", video.videoId);
    } else {
      await supabase.from("video_watches").insert({
        user_id: user.id,
        video_id: video.videoId,
        title: video.title,
        channel_title: video.channelTitle,
        thumbnail_url: video.thumbnailUrl,
        keyword: result?.keyword ?? "",
      });
    }
    loadWatches();
  }

  async function removeWatch(videoId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("video_watches")
      .delete()
      .eq("user_id", user.id)
      .eq("video_id", videoId);
    loadWatches();
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

      {!result && !loading && (
        <div className="flex flex-col gap-3">
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">최근 검색어</span>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setKeyword(s);
                    runSearch(s);
                  }}
                  className="rounded-full border border-black/[.12] px-3 py-1 text-xs transition-colors hover:bg-black/[.04] dark:border-white/[.16] dark:hover:bg-white/[.06]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">이런 키워드를 검색해보세요</span>
            {EXAMPLE_KEYWORDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setKeyword(s);
                  runSearch(s);
                }}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && !result && (
        <div className="flex flex-col gap-3">
          <VideoCardSkeleton />
          <VideoCardSkeleton />
          <VideoCardSkeleton />
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
        <h3 className="text-sm font-semibold text-zinc-500">
          지금 인기 급상승 동영상 (대한민국)
        </h3>
        {trendingLoading ? (
          <>
            <VideoCardSkeleton />
            <VideoCardSkeleton />
          </>
        ) : trendingError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{trendingError}</p>
        ) : trendingVideos.length > 0 ? (
          trendingVideos
            .slice(0, 5)
            .map((v) => (
              <VideoCard
                key={v.videoId}
                video={v}
                watched={watched.has(v.videoId)}
                onToggleWatch={toggleWatch}
              />
            ))
        ) : (
          <p className="text-sm text-zinc-400">데이터 없음</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {watchList.length > 0 && (
        <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
          <h3 className="mb-3 text-sm font-semibold text-zinc-500">
            관심 영상 목록 ({watchList.length})
          </h3>
          <ul className="flex flex-col gap-1">
            {watchList.map((w) => (
              <li
                key={w.video_id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              >
                <a
                  href={`https://www.youtube.com/watch?v=${w.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">{w.title}</span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {w.channel_title}
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => removeWatch(w.video_id)}
                  aria-label="관심 영상에서 삭제"
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-black/[.06] hover:text-red-600 dark:hover:bg-white/[.1] dark:hover:text-red-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div
          className="flex flex-col gap-6 lg:flex-row lg:items-start"
          style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.25s ease" }}
        >
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                상위 {result.youtube.topVideos.length}개 영상 합계 조회수{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {numberFormat.format(result.youtube.totalViews)}
                </span>
              </p>
              <button
                type="button"
                onClick={() =>
                  downloadVideosCsv(result.keyword, [
                    ...result.youtube.topVideos,
                    ...result.youtube.latestVideos,
                  ])
                }
                className="rounded-md border border-black/[.12] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.16] dark:hover:bg-white/[.06]"
              >
                CSV 다운로드
              </button>
            </div>

            {result.youtube.topVideos.length === 0 ? (
              <p className="text-sm text-zinc-400">데이터 없음</p>
            ) : (
              <>
                <h4 className="text-xs font-semibold text-zinc-400">상위 5개 영상</h4>
                {result.youtube.topVideos.map((v) => (
                  <VideoCard
                    key={v.videoId}
                    video={v}
                    watched={watched.has(v.videoId)}
                    onToggleWatch={toggleWatch}
                  />
                ))}
              </>
            )}

            {result.youtube.latestVideos.length > 0 && (
              <>
                <h4 className="mt-2 text-xs font-semibold text-zinc-400">
                  최신 등록 영상 10개
                </h4>
                {result.youtube.latestVideos.map((v) => (
                  <VideoCard
                    key={v.videoId}
                    video={v}
                    watched={watched.has(v.videoId)}
                    onToggleWatch={toggleWatch}
                  />
                ))}
              </>
            )}
          </div>

          <KeywordSidebar
            suggestions={suggestions}
            suggestLoading={suggestLoading}
            relatedKeywords={relatedKeywords}
            onSelect={handleSidebarSelect}
          />
        </div>
      )}
    </div>
  );
}
