// 형태소 분석기 없이 어절 n-gram + 불용어 사전으로 후보 키워드를 뽑는다.
// 정확도가 부족하면 그때 형태소 분석 도입을 검토 (초기 과설계 방지).

const STOPWORDS = new Set([
  "후기", "추천", "방법", "정리", "총정리", "리뷰", "내돈내산", "꿀팁", "완벽정리",
  "하는법", "이유", "하기", "솔직후기", "실사용", "실사용기", "비교",
  "장단점", "장점", "단점", "베스트", "best", "BEST", "top", "TOP", "순위",
  "오늘", "어제", "내일", "요즘", "최근", "이번", "지금", "제품", "브랜드",
  "구매", "구입", "사용법", "사용기", "가격", "할인", "이벤트", "정보", "소개",
  "완료", "시작", "마무리", "이야기", "생각", "일상", "포스팅", "블로그",
  "그리고", "그런데", "하지만", "그래서", "그냥", "정말", "너무", "진짜",
  "이렇게", "그렇게", "어떻게", "매우", "조금", "살짝", "다시", "항상",
  "먼저", "다음", "처음", "마지막", "보다", "위해", "통해", "대해", "인해",
  "따라", "관련", "종류", "방식", "형태", "정도", "수준", "이상", "이하",
  "부분", "전체", "모든", "각종", "다양한", "여러", "각각", "사용", "활용",
  "매일", "매년", "매달", "이제", "역시", "혹시", "만약", "가장", "제일",
  "월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일",
  "여기", "저기", "거기", "이것", "저것", "그것", "무엇", "누구",
  "이거", "그거", "저거",
]);

const YEAR_LIKE = /^(19|20)\d{2}년?$/;
const PURE_NUMBER = /^[0-9,.]+$/;
const MONTH_DAY_LIKE = /^\d{1,2}(월|일|시|분)$/;
const COUNT_LIKE = /^\d{1,4}(개|명|번|위|가지|년|살)$/;
const PARTICIPLE_ENDING = /(는|은|던|되는|하는|있는|없는)$/;

function cleanTitle(title: string): string {
  return title
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/[""''""()\[\]{}|~!@#$%^&*_+=<>\/\\`""]/g, " ")
    .replace(/[·,:;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsableToken(token: string, isLastWordOfGram: boolean): boolean {
  if (token.length < 2 || token.length > 12) return false;
  if (PURE_NUMBER.test(token)) return false;
  if (YEAR_LIKE.test(token)) return false;
  if (MONTH_DAY_LIKE.test(token)) return false;
  if (COUNT_LIKE.test(token)) return false;
  if (STOPWORDS.has(token)) return false;
  if (!/[가-힣]/.test(token)) return false;
  // 어절 하나짜리 후보가 동사/형용사 활용형으로 끝나면 독립 키워드로 부적합
  if (isLastWordOfGram && PARTICIPLE_ENDING.test(token)) return false;
  return true;
}

export type KeywordCandidate = { keyword: string; freq: number; n: number };

export function extractCandidateKeywords(titles: string[], limit = 60): KeywordCandidate[] {
  const freq = new Map<string, number>();

  for (const rawTitle of titles) {
    const cleaned = cleanTitle(rawTitle);
    const words = cleaned.split(" ").filter(Boolean);
    const seenInTitle = new Set<string>();

    for (let n = 1; n <= 3; n++) {
      for (let i = 0; i + n <= words.length; i++) {
        const gramWords = words.slice(i, i + n);
        if (!gramWords.every((w, idx) => isUsableToken(w, idx === gramWords.length - 1))) continue;

        const keyword = gramWords.join(" ");
        if (seenInTitle.has(keyword)) continue;
        seenInTitle.add(keyword);
      }
    }

    for (const keyword of seenInTitle) {
      freq.set(keyword, (freq.get(keyword) ?? 0) + 1);
    }
  }

  return [...freq.entries()]
    .map(([keyword, count]) => ({ keyword, freq: count, n: keyword.includes(" ") ? keyword.split(" ").length : 1 }))
    .filter((c) => (c.n === 1 ? c.freq >= 3 : c.freq >= 2))
    .sort((a, b) => b.freq * (1 + 0.15 * (b.n - 1)) - a.freq * (1 + 0.15 * (a.n - 1)))
    .slice(0, limit);
}
