export type CompetitionGrade = "golden" | "low" | "medium" | "high" | "saturated";

export type Competition = {
  ratio: number;
  grade: CompetitionGrade;
  label: string;
  description: string;
};

// ratio = 누적 블로그 문서수 / 월간 검색량. 실측 예: 제주도 렌트카 4, 다이소 영양제 29, 김치찌개 108, 갑상선 영양제 303
const GRADES: { max: number; grade: CompetitionGrade; label: string; description: string }[] = [
  { max: 5, grade: "golden", label: "황금", description: "검색량 대비 문서가 매우 적어 상위 노출 기회가 큽니다" },
  { max: 30, grade: "low", label: "낮음", description: "문서가 적은 편이라 양질의 글이면 노출을 기대할 수 있습니다" },
  { max: 100, grade: "medium", label: "보통", description: "경쟁이 있는 키워드로, 차별화된 콘텐츠가 필요합니다" },
  { max: 300, grade: "high", label: "높음", description: "문서가 많아 신규 글이 상위에 오르기 어렵습니다" },
  { max: Infinity, grade: "saturated", label: "포화", description: "검색량에 비해 문서가 과도하게 많아 노출이 매우 어렵습니다" },
];

export function getCompetition(blogDocCount: number | null, monthlySearches: number): Competition | null {
  if (blogDocCount === null || monthlySearches <= 0) return null;
  const ratio = blogDocCount / monthlySearches;
  const g = GRADES.find((x) => ratio < x.max)!;
  return { ratio: Math.round(ratio * 10) / 10, grade: g.grade, label: g.label, description: g.description };
}
