import crypto from "crypto";

const BASE_URL = "https://api.naver.com";
const PATH = "/keywordstool";

function generateSignature(timestamp: string, secretKey: string) {
  const message = `${timestamp}.GET.${PATH}`;
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}

export type RelatedKeyword = {
  keyword: string;
  pcCount: number;
  mobileCount: number;
};

export type NaverSearchVolume = {
  pcCount: number;
  mobileCount: number;
  relatedKeywords: RelatedKeyword[];
};

type NaverKeywordItem = {
  relKeyword: string;
  monthlyPcQcCnt: string | number;
  monthlyMobileQcCnt: string | number;
};

function parseCount(value: string | number) {
  if (typeof value === "number") return value;
  if (value.includes("<")) return 5;
  return Number(value.replace(/,/g, "")) || 0;
}

export async function getNaverSearchVolume(
  keyword: string,
): Promise<NaverSearchVolume | null> {
  const apiKey = process.env.NAVER_ADS_ACCESS_LICENSE;
  const secretKey = process.env.NAVER_ADS_SECRET_KEY;
  const customerId = process.env.NAVER_ADS_CUSTOMER_ID;

  if (!apiKey || !secretKey || !customerId) {
    throw new Error("네이버 검색광고 API 키가 설정되지 않았습니다.");
  }

  const timestamp = Date.now().toString();
  const signature = generateSignature(timestamp, secretKey);

  const url = `${BASE_URL}${PATH}?hintKeywords=${encodeURIComponent(
    keyword.replace(/\s/g, ""),
  )}&showDetail=1`;

  const res = await fetch(url, {
    headers: {
      "X-Timestamp": timestamp,
      "X-API-KEY": apiKey,
      "X-Customer": customerId,
      "X-Signature": signature,
    },
  });

  if (!res.ok) {
    throw new Error(`네이버 API 오류: ${res.status}`);
  }

  const data = (await res.json()) as { keywordList?: NaverKeywordItem[] };
  const normalized = keyword.replace(/\s/g, "");
  const list = data.keywordList ?? [];
  const stat = list.find((item) => item.relKeyword === normalized) ?? list[0];

  if (!stat) return null;

  const relatedKeywords: RelatedKeyword[] = list
    .filter((item) => item.relKeyword !== stat.relKeyword)
    .map((item) => ({
      keyword: item.relKeyword,
      pcCount: parseCount(item.monthlyPcQcCnt),
      mobileCount: parseCount(item.monthlyMobileQcCnt),
    }))
    .sort((a, b) => b.pcCount + b.mobileCount - (a.pcCount + a.mobileCount))
    .slice(0, 10);

  return {
    pcCount: parseCount(stat.monthlyPcQcCnt),
    mobileCount: parseCount(stat.monthlyMobileQcCnt),
    relatedKeywords,
  };
}
