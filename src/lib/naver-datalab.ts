const ENDPOINT = "https://naverapihub.apigw.ntruss.com/search-trend/v1/search";

export type TrendPoint = { period: string; ratio: number };
export type NaverTimeUnit = "date" | "week" | "month";

export async function getSearchTrend(
  keyword: string,
  startDate: string,
  endDate: string,
  timeUnit: NaverTimeUnit,
): Promise<TrendPoint[]> {
  const clientId = process.env.NAVER_DATALAB_CLIENT_ID;
  const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("네이버 데이터랩 API 키가 설정되지 않았습니다.");
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      timeUnit,
      keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    console.error("[naver-datalab] error", res.status, bodyText);
    throw new Error(`네이버 데이터랩 API 오류: ${res.status}`);
  }

  const data = (await res.json()) as {
    results?: { data: TrendPoint[] }[];
  };

  return data.results?.[0]?.data ?? [];
}
