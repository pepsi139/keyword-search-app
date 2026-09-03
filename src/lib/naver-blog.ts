const BLOG_ENDPOINT = "https://naverapihub.apigw.ntruss.com/search/v1/blog";

export async function getNaverBlogCount(keyword: string): Promise<number> {
  const clientId = process.env.NAVER_DATALAB_CLIENT_ID;
  const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("네이버 API 키가 설정되지 않았습니다.");
  }

  const url = new URL(BLOG_ENDPOINT);
  url.searchParams.set("query", keyword);
  url.searchParams.set("display", "1");

  const res = await fetch(url, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
  });

  if (!res.ok) {
    throw new Error(`네이버 블로그 검색 API 오류: ${res.status}`);
  }

  const data = (await res.json()) as { total?: number };
  return data.total ?? 0;
}
