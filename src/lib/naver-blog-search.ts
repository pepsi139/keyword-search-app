const SEARCH_URL = "https://naverapihub.apigw.ntruss.com/search/v1/blog";

export type BlogPost = {
  title: string;
  description: string;
  postdate: string; // yyyyMMdd
};

type RawItem = {
  title: string;
  description: string;
  postdate: string;
};

function stripHtml(text: string) {
  return text.replace(/<[^>]*>/g, "");
}

async function fetchPage(query: string, start: number, display: number): Promise<RawItem[]> {
  const clientId = process.env.NAVER_DATALAB_CLIENT_ID;
  const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("네이버 API 키가 설정되지 않았습니다.");
  }

  const url = new URL(SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(display));
  url.searchParams.set("start", String(start));
  url.searchParams.set("sort", "date");

  const res = await fetch(url, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
  });

  if (!res.ok) {
    throw new Error(`네이버 블로그 검색 API 오류: ${res.status}`);
  }

  const data = (await res.json()) as { items?: RawItem[] };
  return data.items ?? [];
}

function toDateNumber(yyyymmdd: string): number {
  return Number(yyyymmdd) || 0;
}

/**
 * 검색어로 블로그 글을 최신순으로 모으되, 지정한 기간(startDate~endDate, yyyyMMdd) 안에
 * 등록된 글만 남긴다. sort=date라 날짜가 범위보다 오래된 글이 나오면 그 시점에서 중단한다.
 */
export async function collectBlogPostsInPeriod(
  query: string,
  startDate: string,
  endDate: string,
  targetCount = 200,
): Promise<BlogPost[]> {
  const start = toDateNumber(startDate);
  const end = toDateNumber(endDate);
  const display = 100;
  const maxStart = 1000; // 네이버 검색 API의 start 파라미터 상한

  const posts: BlogPost[] = [];
  for (let offset = 1; offset <= maxStart && posts.length < targetCount; offset += display) {
    const items = await fetchPage(query, offset, display);
    if (items.length === 0) break;

    let hitOlderThanRange = false;
    for (const item of items) {
      const postDateNum = toDateNumber(item.postdate);
      if (postDateNum > end) continue; // 기간보다 최신 글(드묾)은 건너뛴다
      if (postDateNum < start) {
        hitOlderThanRange = true;
        break;
      }
      posts.push({
        title: stripHtml(item.title),
        description: stripHtml(item.description),
        postdate: item.postdate,
      });
      if (posts.length >= targetCount) break;
    }

    if (hitOlderThanRange || items.length < display) break;
  }

  return posts;
}
