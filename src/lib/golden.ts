import type { Competition, CompetitionGrade } from "./competition";
import type { SerpResult } from "./naver-serp";

export type GoldenGrade = "golden" | "good" | "normal" | "hard";

export type GoldenScore = {
  score: number;
  grade: GoldenGrade;
  label: string;
  parts: { volume: number; competition: number; section: number };
  reason: string;
};

// 검색량: log 스케일, 10만/월이면 1.0
function volumeScore(monthlySearches: number) {
  if (monthlySearches <= 0) return 0;
  return Math.min(1, Math.log10(monthlySearches) / 5);
}

const COMPETITION_SCORE: Record<CompetitionGrade, number> = {
  golden: 1,
  low: 0.8,
  medium: 0.55,
  high: 0.3,
  saturated: 0.1,
};

// 광고 섹션을 제외한 순위 기준. 블로그가 첫 콘텐츠 섹션이면 1.0
function sectionScore(serp: SerpResult | null) {
  if (!serp) return 0.5; // 조회 실패 시 중립값
  const rank = serp.blogOrganicRank;
  if (rank === null) return 0.1;
  if (rank === 1) return 1;
  if (rank === 2) return 0.75;
  if (rank === 3) return 0.5;
  return 0.3;
}

const GRADES: { min: number; grade: GoldenGrade; label: string }[] = [
  { min: 60, grade: "golden", label: "황금" },
  { min: 40, grade: "good", label: "좋음" },
  { min: 20, grade: "normal", label: "보통" },
  { min: 0, grade: "hard", label: "어려움" },
];

export function getGoldenScore(
  monthlySearches: number,
  competition: Competition | null,
  serp: SerpResult | null,
): GoldenScore | null {
  if (monthlySearches <= 0 || !competition) return null;

  const v = volumeScore(monthlySearches);
  const c = COMPETITION_SCORE[competition.grade];
  const s = sectionScore(serp);
  const score = Math.round(100 * Math.sqrt(v) * c * s);
  const g = GRADES.find((x) => score >= x.min)!;

  const reasons: string[] = [];
  if (serp) {
    if (serp.blogOrganicRank === 1) reasons.push("블로그가 첫 콘텐츠 섹션");
    else if (serp.blogOrganicRank === null) reasons.push("통합검색에 블로그 섹션 없음");
    else reasons.push(`블로그 섹션이 ${serp.blogOrganicRank}번째`);
    if (serp.sections.some((x) => x.type === "place")) reasons.push("플레이스 노출");
    if (serp.sections.some((x) => x.type === "shopping")) reasons.push("쇼핑 노출");
  } else {
    reasons.push("섹션 배치 확인 불가");
  }
  reasons.push(`경쟁강도 ${competition.label}`);

  return {
    score,
    grade: g.grade,
    label: g.label,
    parts: { volume: Math.round(v * 100), competition: Math.round(c * 100), section: Math.round(s * 100) },
    reason: reasons.join(" · "),
  };
}
