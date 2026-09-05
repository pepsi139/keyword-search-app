"use client";

import { useState } from "react";

type ChannelInfo = {
  channelId: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
};

type Slot = {
  query: string;
  loading: boolean;
  error: string | null;
  channel: ChannelInfo | null;
};

const EMPTY_SLOT: Slot = { query: "", loading: false, error: null, channel: null };
const numberFormat = new Intl.NumberFormat("ko-KR");

export function ChannelCompare() {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }, { ...EMPTY_SLOT }]);

  function updateQuery(index: number, value: string) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, query: value } : s)));
  }

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    const targets = slots
      .map((s, i) => ({ i, query: s.query.trim() }))
      .filter((s) => s.query.length > 0);

    if (targets.length === 0) return;

    setSlots((prev) =>
      prev.map((s, i) =>
        targets.some((t) => t.i === i) ? { ...s, loading: true, error: null, channel: null } : s,
      ),
    );

    await Promise.all(
      targets.map(async ({ i, query }) => {
        try {
          const res = await fetch("/api/youtube-channel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
          });
          const data = await res.json();
          if (!res.ok) {
            setSlots((prev) =>
              prev.map((s, idx) =>
                idx === i ? { ...s, loading: false, error: data.error ?? "조회 실패" } : s,
              ),
            );
          } else {
            setSlots((prev) =>
              prev.map((s, idx) => (idx === i ? { ...s, loading: false, channel: data.channel } : s)),
            );
          }
        } catch {
          setSlots((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, loading: false, error: "네트워크 오류가 발생했습니다." } : s,
            ),
          );
        }
      }),
    );
  }

  const results = slots.filter((s) => s.channel);
  const maxSubscribers = Math.max(0, ...results.map((s) => s.channel!.subscriberCount));
  const maxViews = Math.max(0, ...results.map((s) => s.channel!.viewCount));
  const maxVideos = Math.max(0, ...results.map((s) => s.channel!.videoCount));

  return (
    <div className="rounded-lg border border-black/[.08] dark:border-white/[.12]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <h3 className="text-sm font-semibold text-zinc-500">채널 비교</h3>
        <span className="text-xs text-zinc-400">{open ? "접기 ▲" : "펼치기 ▼"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-black/[.08] p-4 dark:border-white/[.12]">
          <form onSubmit={handleCompare} className="flex flex-col gap-2 sm:flex-row">
            {slots.map((s, i) => (
              <input
                key={i}
                value={s.query}
                onChange={(e) => updateQuery(i, e.target.value)}
                placeholder={`채널명 ${i + 1}`}
                className="flex-1 rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/[.16] dark:focus:border-white"
              />
            ))}
            <button
              type="submit"
              disabled={slots.every((s) => s.loading)}
              className="shrink-0 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              비교하기
            </button>
          </form>

          <div className="grid gap-3 sm:grid-cols-3">
            {slots.map((s, i) => {
              if (!s.query.trim() && !s.channel && !s.loading && !s.error) return null;
              return (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-lg border border-black/[.08] p-3 dark:border-white/[.12]"
                >
                  {s.loading ? (
                    <p className="text-sm text-zinc-400">불러오는 중...</p>
                  ) : s.error ? (
                    <p className="text-sm text-red-600 dark:text-red-400">{s.error}</p>
                  ) : s.channel ? (
                    <>
                      <div className="flex items-center gap-2">
                        {s.channel.thumbnailUrl && (
                          <img
                            src={s.channel.thumbnailUrl}
                            alt={s.channel.title}
                            className="h-9 w-9 shrink-0 rounded-full"
                          />
                        )}
                        <span className="truncate text-sm font-semibold">{s.channel.title}</span>
                      </div>
                      <dl className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center justify-between">
                          <dt className="text-xs text-zinc-500">구독자</dt>
                          <dd
                            className={
                              s.channel.subscriberCount === maxSubscribers && maxSubscribers > 0
                                ? "font-bold text-blue-600 dark:text-blue-400"
                                : "font-medium"
                            }
                          >
                            {numberFormat.format(s.channel.subscriberCount)}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-xs text-zinc-500">총 조회수</dt>
                          <dd
                            className={
                              s.channel.viewCount === maxViews && maxViews > 0
                                ? "font-bold text-blue-600 dark:text-blue-400"
                                : "font-medium"
                            }
                          >
                            {numberFormat.format(s.channel.viewCount)}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-xs text-zinc-500">영상 수</dt>
                          <dd
                            className={
                              s.channel.videoCount === maxVideos && maxVideos > 0
                                ? "font-bold text-blue-600 dark:text-blue-400"
                                : "font-medium"
                            }
                          >
                            {numberFormat.format(s.channel.videoCount)}
                          </dd>
                        </div>
                      </dl>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
