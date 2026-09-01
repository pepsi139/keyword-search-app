export type YoutubeVideo = {
  title: string;
  viewCount: number;
};

export type YoutubeStats = {
  totalViews: number;
  videos: YoutubeVideo[];
};

type YoutubeSearchItem = { id: { videoId?: string } };
type YoutubeVideoItem = {
  snippet: { title: string };
  statistics: { viewCount?: string };
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

  const videos: YoutubeVideo[] = (videosData.items ?? []).map((item) => ({
    title: item.snippet.title,
    viewCount: Number(item.statistics.viewCount ?? 0),
  }));

  const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);

  return { totalViews, videos };
}
