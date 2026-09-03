const NEWS_ENDPOINT = "https://naverapihub.apigw.ntruss.com/search/v1/news";

const SEED_QUERIES = ["속보", "오늘", "발표", "논란"];

const STOPWORDS = new Set([
  "있다", "없다", "한다", "했다", "위해", "관련", "오늘", "최근", "이번", "기자",
  "사진", "영상", "이날", "가운데", "대한", "통해", "이라고", "라고", "했다고",
  "밝혔다", "전했다", "됐다", "된다", "한다고", "라며", "하며", "면서", "까지",
  "에서", "에게", "보다", "그리고", "하지만", "그러나", "이번에", "현재", "오전",
  "오후", "단독", "속보", "종합", "포토", "인터뷰",
]);

export type TrendingKeyword = { keyword: string; count: number };

type NewsItem = { title: string };

function extractKeywords(titles: string[]): TrendingKeyword[] {
  const freq = new Map<string, number>();

  for (const raw of titles) {
    const clean = raw
      .replace(/<\/?b>/g, "")
      .replace(/&quot;|&apos;|&amp;|&lt;|&gt;/g, " ");
    const tokens = clean.split(/[\s,.'"“”‘’()[\]…\-·|]+/).filter(Boolean);

    for (const t of tokens) {
      if (t.length < 2) continue;
      if (STOPWORDS.has(t)) continue;
      if (/^[0-9]+$/.test(t)) continue;
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }

  return [...freq.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export async function getNewsTrendingKeywords(): Promise<TrendingKeyword[]> {
  const clientId = process.env.NAVER_DATALAB_CLIENT_ID;
  const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("네이버 API 키가 설정되지 않았습니다.");
  }

  const allTitles: string[] = [];

  for (const q of SEED_QUERIES) {
    const url = new URL(NEWS_ENDPOINT);
    url.searchParams.set("query", q);
    url.searchParams.set("display", "30");
    url.searchParams.set("sort", "date");

    const res = await fetch(url, {
      headers: {
        "X-NCP-APIGW-API-KEY-ID": clientId,
        "X-NCP-APIGW-API-KEY": clientSecret,
      },
    });

    if (!res.ok) continue;

    const data = (await res.json()) as { items?: NewsItem[] };
    for (const item of data.items ?? []) {
      allTitles.push(item.title);
    }
  }

  return extractKeywords(allTitles);
}
