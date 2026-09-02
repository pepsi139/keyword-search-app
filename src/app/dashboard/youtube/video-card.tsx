type VideoComment = { author: string; text: string; likeCount: number };

export type Video = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  subscriberCount: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  topComments: VideoComment[];
};

const numberFormat = new Intl.NumberFormat("ko-KR");

export function VideoCard({
  video,
  watched,
  onToggleWatch,
}: {
  video: Video;
  watched: boolean;
  onToggleWatch: (video: Video) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
      <div className="flex gap-4">
        {video.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="h-20 w-32 shrink-0 rounded-md object-cover"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <a
            href={`https://www.youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm font-medium hover:underline"
          >
            {video.title}
          </a>
          <p className="text-xs text-zinc-500">
            {video.channelTitle} · 구독자 {numberFormat.format(video.subscriberCount)}명
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>조회수 {numberFormat.format(video.viewCount)}</span>
            <span>좋아요 {numberFormat.format(video.likeCount)}</span>
            <span>댓글 {numberFormat.format(video.commentCount)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggleWatch(video)}
          className={`h-fit shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
            watched
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-black/[.12] text-zinc-500 hover:bg-black/[.04] dark:border-white/[.16] dark:hover:bg-white/[.06]"
          }`}
        >
          {watched ? "🔔 관심 영상 저장됨" : "🔔 관심 영상 저장"}
        </button>
      </div>

      {video.topComments.length > 0 && (
        <div className="border-t border-black/[.06] pt-3 dark:border-white/[.08]">
          <p className="mb-2 text-xs font-semibold text-zinc-500">
            시청자 댓글 반응 ({video.topComments.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {video.topComments.map((c, i) => (
              <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-zinc-500">{c.author}</span>
                {": "}
                <span className="line-clamp-2">{c.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
