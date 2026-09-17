// 형태소 분석기 없이 어절 n-gram + 불용어 사전으로 후보 키워드를 뽑는다.
// 정확도가 부족하면 그때 형태소 분석 도입을 검토 (초기 과설계 방지).
//
// 형태소 분석기(예: eunjeon/mecab-ko)를 붙이면 훨씬 정확해지지만, 네이티브 바이너리를
// 빌드해야 해서 Vercel 서버리스 환경과는 맞지 않아 당장은 도입하지 않는다. 대신
// 실제 결과에서 새는 활용형/조사 붙은 노이즈를 계속 STOPWORDS·PARTICIPLE_ENDING에
// 추가하는 living document로 운영한다.

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
  // 실제 운영 결과에서 새는 것으로 확인된 노이즈 추가분
  "관리", "선택", "하루", "경우", "문제", "가지", "효과", "가능", "필요",
  "이후", "보통", "일반", "특히", "다양",
  "위한", "있습니다", "있어요", "있어", "가능합니다", "필요한", "쉬운",
  "간편한", "주요", "어떤", "없이", "평소",
  // "-한"으로 끝나는 형용사형은 PARTICIPLE_ENDING에 넣으면 은행·제한 같은 명사가 죽어서 개별 등록
  "건강한", "꾸준한", "꾸준히", "바쁜", "모음", "총모음",
]);

// 카테고리(소분류 기준)별로 추가할 불용어. 다른 카테고리에서는 진짜 키워드일 수 있어서
// 전역이 아니라 카테고리별로 분리한다. 키는 naver-directory.ts의 topic.name과 맞춘다.
const CATEGORY_STOPWORDS: Record<string, string[]> = {
  "건강·의학": ["섭취", "복용", "관절", "균형", "어린이", "부담"],
  "IT·컴퓨터": ["이용", "진행", "확인", "설정"],
};

function getStopwordsFor(categoryKey?: string | null): Set<string> {
  if (!categoryKey || !CATEGORY_STOPWORDS[categoryKey]) return STOPWORDS;
  return new Set([...STOPWORDS, ...CATEGORY_STOPWORDS[categoryKey]]);
}

const YEAR_LIKE = /^(19|20)\d{2}년?$/;
const PURE_NUMBER = /^[0-9,.]+$/;
const MONTH_DAY_LIKE = /^\d{1,2}(월|일|시|분)$/;
const COUNT_LIKE = /^\d{1,4}(개|명|번|위|가지|년|살)$/;
// 동사/형용사 활용형 어미 + 명사에 바로 붙은 흔한 조사(을/를/의 등).
// 형태소 분석기가 아니라 문자열 끝만 보는 휴리스틱이라 오탐 가능성이 있어서,
// "이"·"가"는 일부러 뺐다 (예: "고양이", "호랑이" 같은 반려동물 카테고리의
// 진짜 명사까지 걸러내 버리는 사고가 실측으로 확인됨). "을"·"를"·"의"는
// 그 정도로 흔한 명사 끝음절이 아니라 상대적으로 안전하다고 판단했다.
const PARTICIPLE_ENDING =
  /(는|은|던|되는|하는|있는|없는|위한|있습니다|있어요|있어|없이|을|를|의)$/;

function cleanTitle(title: string): string {
  return title
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/[‘-‟]/g, " ") // 유니코드 따옴표류(‘’“”‚„‹› 등) — 네이버 검색광고 API가 포함 키워드를 거부함
    .replace(/[""''""()\[\]{}|~!@#$%^&*_+=<>\/\\`""]/g, " ")
    .replace(/[·,:;.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsableToken(token: string, isLastWordOfGram: boolean, stopwords: Set<string>): boolean {
  if (token.length < 2 || token.length > 12) return false;
  if (PURE_NUMBER.test(token)) return false;
  if (YEAR_LIKE.test(token)) return false;
  if (MONTH_DAY_LIKE.test(token)) return false;
  if (COUNT_LIKE.test(token)) return false;
  if (stopwords.has(token)) return false;
  if (!/[가-힣]/.test(token)) return false;
  // 어절 하나짜리 후보가 동사/형용사 활용형으로 끝나면 독립 키워드로 부적합
  if (isLastWordOfGram && PARTICIPLE_ENDING.test(token)) return false;
  return true;
}

export type KeywordCandidate = { keyword: string; freq: number; n: number };

/**
 * @param categoryKey - naver-directory.ts의 topic.name(소분류). 지정하면 해당 카테고리
 *   전용 불용어(CATEGORY_STOPWORDS)도 함께 적용한다.
 */
export function extractCandidateKeywords(
  titles: string[],
  limit = 60,
  categoryKey?: string | null,
): KeywordCandidate[] {
  const stopwords = getStopwordsFor(categoryKey);
  const freq = new Map<string, number>();

  for (const rawTitle of titles) {
    const cleaned = cleanTitle(rawTitle);
    const words = cleaned.split(" ").filter(Boolean);
    const seenInTitle = new Set<string>();

    for (let n = 1; n <= 3; n++) {
      for (let i = 0; i + n <= words.length; i++) {
        const gramWords = words.slice(i, i + n);
        if (!gramWords.every((w, idx) => isUsableToken(w, idx === gramWords.length - 1, stopwords))) continue;

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
    .filter((c) => c.freq >= 2)
    .sort((a, b) => b.freq * (1 + 0.15 * (b.n - 1)) - a.freq * (1 + 0.15 * (a.n - 1)))
    .slice(0, limit);
}
