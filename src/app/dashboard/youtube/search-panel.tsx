"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KeywordSidebar } from "../keyword-sidebar";
import { VideoCard, type Video } from "./video-card";

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
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex flex-1 flex-col gap-3">
            <p className="text-sm text-zinc-500">
              상위 {result.youtube.topVideos.length}개 영상 합계 조회수{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {numberFormat.format(result.youtube.totalViews)}
              </span>
            </p>

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
