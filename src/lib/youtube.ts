export type VideoComment = {
  author: string;
  text: string;
  likeCount: number;
};

export type YoutubeVideo = {
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

export type YoutubeStats = {
  totalViews: number;
  topVideos: YoutubeVideo[];
  latestVideos: YoutubeVideo[];
};

type YoutubeSearchItem = { id: { videoId?: string } };
type YoutubeVideoItem = {
  id: string;
  snippet: {
    title: string;
    channelId: string;
    channelTitle: string;
    thumbnails: { medium?: { url: string }; default?: { url: string } };
  };
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};
type YoutubeChannelItem = {
  id: string;
  statistics: { subscriberCount?: string };
};

type YoutubeCommentThreadItem = {
  snippet: {
    topLevelComment: {
      snippet: {
        authorDisplayName: string;
        textDisplay: string;
        likeCount?: number;
      };
    };
  };
};

const FEEDBACK_KEYWORDS = [
  "아쉽",
  "아쉬웠",
  "궁금",
  "더 알고",
  "부족",
  "빠졌",
  "빠진",
  "몰랐",
  "알려주세요",
  "설명해주",
  "다뤄주",
  "리뷰해주",
  "부탁드",
];

export async function getVideoComments(videoId: string): Promise<VideoComment[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const url = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("videoId", videoId);
  url.searchParams.set("maxResults", "100");
  url.searchParams.set("order", "relevance");
  url.searchParams.set("textFormat", "plainText");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  if (!res.ok) {
    // 댓글이 비활성화된 영상 등은 조용히 빈 배열 처리
    return [];
  }

  const data = (await res.json()) as { items?: YoutubeCommentThreadItem[] };
  const comments: VideoComment[] = (data.items ?? []).map((item) => {
    const top = item.snippet.topLevelComment.snippet;
    return {
      author: top.authorDisplayName,
      text: top.textDisplay,
      likeCount: top.likeCount ?? 0,
    };
  });

  const feedbackComments = comments.filter((c) =>
    FEEDBACK_KEYWORDS.some((kw) => c.text.includes(kw)),
  );
  const pool = feedbackComments.length > 0 ? feedbackComments : comments;

  return pool.sort((a, b) => b.likeCount - a.likeCount).slice(0, 5);
}

export async function getYoutubeSuggestions(keyword: string): Promise<string[]> {
  const url = new URL("https://suggestqueries.google.com/complete/search");
  url.searchParams.set("client", "firefox");
  url.searchParams.set("ds", "yt");
  url.searchParams.set("q", keyword);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube 자동완성 오류: ${res.status}`);
  }
  const data = (await res.json()) as [string, string[]];
  return (data[1] ?? []).filter((s) => s.toLowerCase() !== keyword.toLowerCase());
}

async function searchVideoIds(
  apiKey: string,
  keyword: string,
  order: "relevance" | "date",
  maxResults: number,
): Promise<string[]> {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "id");
  searchUrl.searchParams.set("q", keyword);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", String(maxResults));
  searchUrl.searchParams.set("order", order);
  searchUrl.searchParams.set("key", apiKey);

  const res = await fetch(searchUrl);
  if (!res.ok) {
    throw new Error(`YouTube 검색 API 오류: ${res.status}`);
  }
  const data = (await res.json()) as { items?: YoutubeSearchItem[] };
  return (data.items ?? [])
    .map((item) => item.id.videoId)
    .filter((id): id is string => Boolean(id));
}

export async function getYoutubeStats(keyword: string): Promise<YoutubeStats> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YouTube API 키가 설정되지 않았습니다.");
  }

  const [topIds, latestIds] = await Promise.all([
    searchVideoIds(apiKey, keyword, "relevance", 5),
    searchVideoIds(apiKey, keyword, "date", 10),
  ]);

  const videoIds = [...new Set([...topIds, ...latestIds])];

  if (videoIds.length === 0) {
    return { totalViews: 0, topVideos: [], latestVideos: [] };
  }

  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videosUrl.searchParams.set("part", "snippet,statistics");
  videosUrl.searchParams.set("id", videoIds.join(","));
  videosUrl.searchParams.set("key", apiKey);

  const videosRes = await fetch(videosUrl);
  if (!videosRes.ok) {
    throw new Error(`YouTube 동영상 API 오류: ${videosRes.status}`);
  }
  const videosData = (await videosRes.json()) as { items?: YoutubeVideoItem[] };
  const videoItems = videosData.items ?? [];

  const channelIds = [...new Set(videoItems.map((v) => v.snippet.channelId))];
  const subscriberByChannel = new Map<string, number>();

  if (channelIds.length > 0) {
    const channelsUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelsUrl.searchParams.set("part", "statistics");
    channelsUrl.searchParams.set("id", channelIds.join(","));
    channelsUrl.searchParams.set("key", apiKey);

    const channelsRes = await fetch(channelsUrl);
    if (!channelsRes.ok) {
      throw new Error(`YouTube 채널 API 오류: ${channelsRes.status}`);
    }
    const channelsData = (await channelsRes.json()) as { items?: YoutubeChannelItem[] };
    for (const c of channelsData.items ?? []) {
      subscriberByChannel.set(c.id, Number(c.statistics.subscriberCount ?? 0));
    }
  }

  const commentsByVideo = await Promise.all(
    videoItems.map((item) => getVideoComments(item.id)),
  );

  const videoMap = new Map<string, YoutubeVideo>();
  videoItems.forEach((item, i) => {
    videoMap.set(item.id, {
      videoId: item.id,
      title: item.snippet.title,
      thumbnailUrl:
        item.snippet.thumbnails.medium?.url ??
        item.snippet.thumbnails.default?.url ??
        "",
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      subscriberCount: subscriberByChannel.get(item.snippet.channelId) ?? 0,
      viewCount: Number(item.statistics.viewCount ?? 0),
      likeCount: Number(item.statistics.likeCount ?? 0),
      commentCount: Number(item.statistics.commentCount ?? 0),
      topComments: commentsByVideo[i] ?? [],
    });
  });

  const topVideos = topIds.map((id) => videoMap.get(id)).filter((v): v is YoutubeVideo => Boolean(v));
  const latestVideos = latestIds.map((id) => videoMap.get(id)).filter((v): v is YoutubeVideo => Boolean(v));
  const totalViews = topVideos.reduce((sum, v) => sum + v.viewCount, 0);

  return { totalViews, topVideos, latestVideos };
}
