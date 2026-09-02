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
};

export type YoutubeStats = {
  totalViews: number;
  videos: YoutubeVideo[];
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

export async function getYoutubeStats(keyword: string): Promise<YoutubeStats> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YouTube API 키가 설정되지 않았습니다.");
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "id");
  searchUrl.searchParams.set("q", keyword);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", "5");
  searchUrl.searchParams.set("order", "relevance");
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    throw new Error(`YouTube 검색 API 오류: ${searchRes.status}`);
  }
  const searchData = (await searchRes.json()) as { items?: YoutubeSearchItem[] };
  const videoIds = (searchData.items ?? [])
    .map((item) => item.id.videoId)
    .filter((id): id is string => Boolean(id));

  if (videoIds.length === 0) {
    return { totalViews: 0, videos: [] };
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

  const videos: YoutubeVideo[] = videoItems.map((item) => ({
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
  }));

  const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);

  return { totalViews, videos };
}
