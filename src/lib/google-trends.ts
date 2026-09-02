export type TrendPoint = { period: string; ratio: number };

type ExploreWidget = {
  id: string;
  token: string;
  request: Record<string, unknown>;
};

async function fetchTrendsJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  });

  const text = await res.text();

  if (!res.ok) {
    console.error("[google-trends] http error", res.status, text.slice(0, 300));
    throw new Error(`Google Trends 오류: ${res.status}`);
  }

  const jsonText = text.replace(/^\)\]\}',?\n/, "");
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    console.error("[google-trends] parse error, raw text:", text.slice(0, 300));
    throw new Error("Google Trends 응답 파싱 오류");
  }
}

/**
 * Google Trends는 공식 API가 없어 비공식 내부 엔드포인트를 사용합니다.
 * 구글이 예고 없이 응답 형식을 바꾸거나 접근을 차단할 수 있습니다.
 */
export async function getGoogleTrendsInterest(
  keyword: string,
  timeframe: string,
): Promise<TrendPoint[]> {
  const exploreReq = {
    comparisonItem: [{ keyword, geo: "KR", time: timeframe }],
    category: 0,
    property: "",
  };
  const exploreUrl = `https://trends.google.com/trends/api/explore?hl=ko&tz=-540&req=${encodeURIComponent(
    JSON.stringify(exploreReq),
  )}&geo=KR`;

  const exploreData = await fetchTrendsJson<{ widgets?: ExploreWidget[] }>(exploreUrl);
  const widget = exploreData.widgets?.find((w) => w.id === "TIMESERIES");
  if (!widget) return [];

  const widgetUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=ko&tz=-540&req=${encodeURIComponent(
    JSON.stringify(widget.request),
  )}&token=${widget.token}`;

  const widgetData = await fetchTrendsJson<{
    default?: { timelineData?: { formattedTime: string; value: number[] }[] };
  }>(widgetUrl);

  const timeline = widgetData.default?.timelineData ?? [];

  return timeline.map((item) => ({
    period: item.formattedTime,
    ratio: item.value?.[0] ?? 0,
  }));
}
