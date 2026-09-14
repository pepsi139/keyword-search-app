const SEARCH_BASE = "https://naverapihub.apigw.ntruss.com/search/v1";

export type DocCounts = {
  blog: number | null;
  cafe: number | null;
  kin: number | null;
  web: number | null;
};

const SERVICES: Record<keyof DocCounts, string> = {
  blog: "blog",
  cafe: "cafearticle",
  kin: "kin",
  web: "webkr",
};

async function fetchTotal(service: string, keyword: string): Promise<number> {
  const clientId = process.env.NAVER_DATALAB_CLIENT_ID;
  const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("네이버 API 키가 설정되지 않았습니다.");
  }

  const url = new URL(`${SEARCH_BASE}/${service}`);
  url.searchParams.set("query", keyword);
  url.searchParams.set("display", "1");

  const res = await fetch(url, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
  });

  if (!res.ok) {
    throw new Error(`네이버 ${service} 검색 API 오류: ${res.status}`);
  }

  const data = (await res.json()) as { total?: number };
  return data.total ?? 0;
}

export function getNaverBlogCount(keyword: string): Promise<number> {
  return fetchTotal(SERVICES.blog, keyword);
}

// 일부 서비스(카페/웹문서)는 API HUB 콘솔에서 활성화되지 않으면 401이 나므로 개별 실패를 null로 흡수
export async function getNaverDocCounts(keyword: string): Promise<DocCounts> {
  const keys = Object.keys(SERVICES) as (keyof DocCounts)[];
  const results = await Promise.allSettled(keys.map((k) => fetchTotal(SERVICES[k], keyword)));
  const counts = { blog: null, cafe: null, kin: null, web: null } as DocCounts;
  keys.forEach((k, i) => {
    const r = results[i];
    counts[k] = r.status === "fulfilled" ? r.value : null;
  });
  return counts;
}
