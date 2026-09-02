"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Video = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  subscriberCount: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
};

type YoutubeResult = {
  keyword: string;
  youtube: {
    totalViews: number;
    videos: Video[];
  };
};

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

      {watchList.length > 0 && (
        <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
          <h3 className="mb-3 text-sm font-semibold text-zinc-500">
            관심 영상 목록 ({watchList.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {watchList.map((w) => (
              <li key={w.video_id}>
                <a
                  href={`https://www.youtube.com/watch?v=${w.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                >
                  <span className="truncate">{w.title}</span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {w.channel_title}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-500">
            상위 {result.youtube.videos.length}개 영상 합계 조회수{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {numberFormat.format(result.youtube.totalViews)}
            </span>
          </p>

          {result.youtube.videos.length === 0 ? (
            <p className="text-sm text-zinc-400">데이터 없음</p>
          ) : (
            result.youtube.videos.map((v) => (
              <div
                key={v.videoId}
                className="flex gap-4 rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]"
              >
                {v.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.thumbnailUrl}
                    alt={v.title}
                    className="h-20 w-32 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <a
                    href={`https://www.youtube.com/watch?v=${v.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {v.title}
                  </a>
                  <p className="text-xs text-zinc-500">
                    {v.channelTitle} · 구독자 {numberFormat.format(v.subscriberCount)}명
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span>조회수 {numberFormat.format(v.viewCount)}</span>
                    <span>좋아요 {numberFormat.format(v.likeCount)}</span>
                    <span>댓글 {numberFormat.format(v.commentCount)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleWatch(v)}
                  className={`h-fit shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    watched.has(v.videoId)
                      ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                      : "border-black/[.12] text-zinc-500 hover:bg-black/[.04] dark:border-white/[.16] dark:hover:bg-white/[.06]"
                  }`}
                >
                  {watched.has(v.videoId) ? "🔔 관심 영상 저장됨" : "🔔 관심 영상 저장"}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
