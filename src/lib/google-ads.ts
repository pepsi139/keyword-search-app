export type GoogleSearchVolume = {
  avgMonthlySearches: number;
};

// Google Ads API v25 기준 (2026-09). 버전이 sunset되면 developers.google.com/google-ads/api/docs/release-notes 확인.
const API_VERSION = "v25";
const GEO_TARGET_SOUTH_KOREA = "geoTargetConstants/2410";
const LANGUAGE_KOREAN = "languageConstants/1012";

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Ads OAuth 자격 증명이 설정되지 않았습니다.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google OAuth 토큰 갱신 오류: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

type HistoricalMetricsResponse = {
  results?: {
    text?: string;
    keywordMetrics?: { avgMonthlySearches?: string | number };
  }[];
};

export async function getGoogleSearchVolume(keyword: string): Promise<GoogleSearchVolume | null> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  if (!developerToken || !customerId) {
    throw new Error("Google Ads API 자격 증명이 설정되지 않았습니다.");
  }

  const accessToken = await getAccessToken();

  const res = await fetch(
    `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}:generateKeywordHistoricalMetrics`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "login-customer-id": customerId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keywords: [keyword],
        geoTargetConstants: [GEO_TARGET_SOUTH_KOREA],
        keywordPlanNetwork: "GOOGLE_SEARCH",
        language: LANGUAGE_KOREAN,
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Ads API 오류 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as HistoricalMetricsResponse;
  const metrics = data.results?.[0]?.keywordMetrics;

  if (!metrics || metrics.avgMonthlySearches === undefined) return null;

  return { avgMonthlySearches: Number(metrics.avgMonthlySearches) };
}
