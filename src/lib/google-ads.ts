export type GoogleSearchVolume = {
  avgMonthlySearches: number;
};

/**
 * Google Ads API는 개발자 토큰 기본 액세스 승인 + OAuth 리프레시 토큰 발급이
 * 끝나야 실제 연동이 가능합니다. 승인 전까지는 null을 반환해 UI에서
 * "심사중"으로 표시합니다.
 */
export async function getGoogleSearchVolume(
  _keyword: string,
): Promise<GoogleSearchVolume | null> {
  return null;
}
