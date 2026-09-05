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
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  topComments: VideoComment[];
};

export type YoutubeStats = {
  totalViews: number;
  topVideos: YoutubeVideo[];
  latestVideos: YoutubeVideo[];
  competitionCount: number;
};

export type ChannelInfo = {
  channelId: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
};

type YoutubeSearchItem = { id: { videoId?: string } };
type YoutubeVideoItem = {
  id: string;
  snippet: {
    title: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
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
): Promise<{ ids: string[]; totalResults: number }> {
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
  const data = (await res.json()) as {
    items?: YoutubeSearchItem[];
    pageInfo?: { totalResults?: number };
  };
  const ids = (data.items ?? [])
    .map((item) => item.id.videoId)
    .filter((id): id is string => Boolean(id));
  return { ids, totalResults: data.pageInfo?.totalResults ?? 0 };
}

export async function getYoutubeStats(keyword: string): Promise<YoutubeStats> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YouTube API 키가 설정되지 않았습니다.");
  }

  const [topSearch, latestSearch] = await Promise.all([
    searchVideoIds(apiKey, keyword, "relevance", 5),
    searchVideoIds(apiKey, keyword, "date", 10),
  ]);
  const topIds = topSearch.ids;
  const latestIds = latestSearch.ids;
  const competitionCount = topSearch.totalResults;

  const videoIds = [...new Set([...topIds, ...latestIds])];

  if (videoIds.length === 0) {
    return { totalViews: 0, topVideos: [], latestVideos: [], competitionCount };
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
      publishedAt: item.snippet.publishedAt,
      viewCount: Number(item.statistics.viewCount ?? 0),
      likeCount: Number(item.statistics.likeCount ?? 0),
      commentCount: Number(item.statistics.commentCount ?? 0),
      topComments: commentsByVideo[i] ?? [],
    });
  });

  const topVideos = topIds.map((id) => videoMap.get(id)).filter((v): v is YoutubeVideo => Boolean(v));
  const latestVideos = latestIds.map((id) => videoMap.get(id)).filter((v): v is YoutubeVideo => Boolean(v));
  const totalViews = topVideos.reduce((sum, v) => sum + v.viewCount, 0);

  return { totalViews, topVideos, latestVideos, competitionCount };
}

type YoutubeChannelDetailItem = {
  id: string;
  snippet: { title: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
  statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string };
};

function toChannelInfo(item: YoutubeChannelDetailItem): ChannelInfo {
  return {
    channelId: item.id,
    title: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? "",
    subscriberCount: Number(item.statistics.subscriberCount ?? 0),
    viewCount: Number(item.statistics.viewCount ?? 0),
    videoCount: Number(item.statistics.videoCount ?? 0),
  };
}

async function fetchChannelByParam(param: "id" | "forHandle" | "forUsername", value: string): Promise<ChannelInfo | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YouTube API 키가 설정되지 않았습니다.");
  }

  const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  channelUrl.searchParams.set("part", "snippet,statistics");
  channelUrl.searchParams.set(param, value);
  channelUrl.searchParams.set("key", apiKey);

  const channelRes = await fetch(channelUrl);
  if (!channelRes.ok) {
    throw new Error(`YouTube 채널 API 오류: ${channelRes.status}`);
  }
  const channelData = (await channelRes.json()) as { items?: YoutubeChannelDetailItem[] };
  const item = channelData.items?.[0];
  return item ? toChannelInfo(item) : null;
}

export async function getChannelInfo(query: string): Promise<ChannelInfo | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YouTube API 키가 설정되지 않았습니다.");
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("type", "channel");
  searchUrl.searchParams.set("maxResults", "1");
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    throw new Error(`YouTube 채널 검색 API 오류: ${searchRes.status}`);
  }
  const searchData = (await searchRes.json()) as {
    items?: { id: { channelId?: string } }[];
  };
  const channelId = searchData.items?.[0]?.id.channelId;
  if (!channelId) return null;

  return fetchChannelByParam("id", channelId);
}

export type ParsedChannelInput =
  | { type: "id"; value: string }
  | { type: "handle"; value: string }
  | { type: "username"; value: string }
  | { type: "search"; value: string };

// 유튜브 채널 URL의 4가지 형태(/channel/ID, /@handle, /c/커스텀명, /user/아이디)를 구분한다.
// URL이 아니면 null을 반환해 "이건 채널 입력이 아니라 일반 키워드"임을 알린다.
export function parseChannelUrl(input: string): ParsedChannelInput | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^@[\w.-]+$/.test(trimmed)) {
    return { type: "handle", value: trimmed };
  }

  if (!/youtube\.com|youtu\.be/i.test(trimmed)) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const path = url.pathname;

    const channelMatch = path.match(/\/channel\/([\w-]+)/);
    if (channelMatch) return { type: "id", value: channelMatch[1] };

    const handleMatch = path.match(/\/(@[\w.-]+)/);
    if (handleMatch) return { type: "handle", value: handleMatch[1] };

    const userMatch = path.match(/\/user\/([\w-]+)/);
    if (userMatch) return { type: "username", value: userMatch[1] };

    const customMatch = path.match(/\/c\/([^/?]+)/);
    if (customMatch) return { type: "search", value: decodeURIComponent(customMatch[1]) };

    return null;
  } catch {
    return null;
  }
}

// 채널 URL/핸들/이름을 모두 받아 채널 정보를 조회한다. 검색창의 스마트 입력 감지에 사용.
export async function resolveChannel(input: string): Promise<ChannelInfo | null> {
  const parsed = parseChannelUrl(input);
  if (!parsed) return getChannelInfo(input);

  if (parsed.type === "id") return fetchChannelByParam("id", parsed.value);
  if (parsed.type === "handle") return fetchChannelByParam("forHandle", parsed.value);
  if (parsed.type === "username") return fetchChannelByParam("forUsername", parsed.value);
  return getChannelInfo(parsed.value);
}

export async function getTrendingVideos(): Promise<YoutubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YouTube API 키가 설정되지 않았습니다.");
  }

  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videosUrl.searchParams.set("part", "snippet,statistics");
  videosUrl.searchParams.set("chart", "mostPopular");
  videosUrl.searchParams.set("regionCode", "KR");
  videosUrl.searchParams.set("maxResults", "10");
  videosUrl.searchParams.set("key", apiKey);

  const videosRes = await fetch(videosUrl);
  if (!videosRes.ok) {
    throw new Error(`YouTube 인기 급상승 API 오류: ${videosRes.status}`);
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
    if (channelsRes.ok) {
      const channelsData = (await channelsRes.json()) as { items?: YoutubeChannelItem[] };
      for (const c of channelsData.items ?? []) {
        subscriberByChannel.set(c.id, Number(c.statistics.subscriberCount ?? 0));
      }
    }
  }

  return videoItems.map((item) => ({
    videoId: item.id,
    title: item.snippet.title,
    thumbnailUrl:
      item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? "",
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    subscriberCount: subscriberByChannel.get(item.snippet.channelId) ?? 0,
    publishedAt: item.snippet.publishedAt,
    viewCount: Number(item.statistics.viewCount ?? 0),
    likeCount: Number(item.statistics.likeCount ?? 0),
    commentCount: Number(item.statistics.commentCount ?? 0),
    topComments: [],
  }));
}
