import { unstable_cache } from "next/cache";

// 네이버 모바일 통합검색 HTML의 블록 식별자(data-block-id 등)를 읽어 섹션 순서를 추출합니다.
// 화면 텍스트가 아니라 템플릿 id 기반이라 디자인 변경에 비교적 강하지만, 식별자가 바뀌면 "unknown"이 늘어나므로
// 결과의 unknownRatio 를 모니터링하세요.

export type SerpSectionType =
  | "powerlink"
  | "brand_ad"
  | "place"
  | "shopping"
  | "ai_briefing"
  | "popular_posts"
  | "brand_content"
  | "blog"
  | "cafe"
  | "kin"
  | "influencer"
  | "clip"
  | "video"
  | "image"
  | "news"
  | "web"
  | "unknown";

export const SERP_SECTION_LABEL: Record<SerpSectionType, string> = {
  powerlink: "파워링크",
  brand_ad: "브랜드광고",
  place: "플레이스",
  shopping: "쇼핑",
  ai_briefing: "AI 브리핑",
  popular_posts: "인기글",
  brand_content: "브랜드 콘텐츠",
  blog: "블로그",
  cafe: "카페",
  kin: "지식iN",
  influencer: "인플루언서",
  clip: "클립",
  video: "동영상",
  image: "이미지",
  news: "뉴스",
  web: "웹사이트",
  unknown: "기타",
};

export const AD_SECTIONS: ReadonlySet<SerpSectionType> = new Set(["powerlink", "brand_ad", "brand_content"]);
export const BLOG_SECTIONS: ReadonlySet<SerpSectionType> = new Set(["popular_posts", "blog"]);

export type SerpSection = { type: SerpSectionType; label: string; isAd: boolean };

export type SerpResult = {
  sections: SerpSection[];
  blogRank: number | null;
  blogOrganicRank: number | null;
  fetchedAt: string;
};

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 13; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36";

function classifyTag(attrs: string): SerpSectionType | null {
  const id = (attrs.match(/\bid="([^"]+)"/) || [])[1] || "";
  const cls = (attrs.match(/\bclass="([^"]+)"/) || [])[1] || "";
  const blockId = (attrs.match(/data-block-id="([^"]+)"/) || [])[1];
  const area = (attrs.match(/data-meta-area="([^"]+)"/) || [])[1] || "";
  const slog = (attrs.match(/data-slog-container="([^"]+)"/) || [])[1] || "";
  const laim = (attrs.match(/data-laim-exp-id="([^"]+)"/) || [])[1] || "";

  if (id.startsWith("mobilePowerLink") || /(^|\s)(_pl_section|ad_section)(\s|$)/.test(cls)) return "powerlink";
  if (/(^|\s)sp_brand(\s|$)/.test(cls)) return "brand_ad";
  if (laim === "loc_plc" || slog === "loc_plc") return "place";
  if (/^(shp_|shs_)/.test(slog)) return "shopping";

  if (!blockId) return null;
  const [category, template = ""] = blockId.split("/");
  switch (category) {
    case "ai-briefing":
      return "ai_briefing";
    case "aipick":
      return "popular_posts";
    case "review":
      if (template.includes("review_blog")) return "blog";
      if (area.startsWith("ugB_pk")) return "brand_content";
      return "blog";
    case "kin":
      return "kin";
    case "cafe":
      return "cafe";
    case "ugc":
      return template.includes("influencer") ? "influencer" : "blog";
    case "clip":
      return "clip";
    case "video":
      return "video";
    case "image":
      return "image";
    case "news":
      return "news";
    case "web":
      return "web";
    case "qra":
      return null; // 관련 질문 칩 — 콘텐츠 섹션이 아님
    default:
      return "unknown";
  }
}

export function parseSerpSections(html: string): SerpSection[] {
  const seen = new Set<SerpSectionType>();
  const sections: SerpSection[] = [];
  const tagRe = /<(?:section|div)\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const type = classifyTag(m[1]);
    if (!type || seen.has(type)) continue;
    seen.add(type);
    sections.push({ type, label: SERP_SECTION_LABEL[type], isAd: AD_SECTIONS.has(type) });
  }
  return sections;
}

export function summarizeSerp(sections: SerpSection[]): Omit<SerpResult, "fetchedAt"> {
  const blogIndex = sections.findIndex((s) => BLOG_SECTIONS.has(s.type));
  const organic = sections.filter((s) => !s.isAd);
  const organicIndex = organic.findIndex((s) => BLOG_SECTIONS.has(s.type));
  return {
    sections,
    blogRank: blogIndex >= 0 ? blogIndex + 1 : null,
    blogOrganicRank: organicIndex >= 0 ? organicIndex + 1 : null,
  };
}

async function fetchSerp(keyword: string): Promise<SerpResult> {
  const url = new URL("https://m.search.naver.com/search.naver");
  url.searchParams.set("where", "m");
  url.searchParams.set("query", keyword);

  const res = await fetch(url, {
    headers: { "User-Agent": MOBILE_UA, "Accept-Language": "ko-KR,ko;q=0.9" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`네이버 통합검색 조회 실패: ${res.status}`);

  const html = await res.text();
  const sections = parseSerpSections(html);
  if (sections.length === 0) throw new Error("통합검색 섹션을 인식하지 못했습니다 (페이지 구조 변경 가능성)");

  return { ...summarizeSerp(sections), fetchedAt: new Date().toISOString() };
}

export const getNaverSerp = unstable_cache(fetchSerp, ["naver-serp-v1"], { revalidate: 60 * 60 * 24 });
