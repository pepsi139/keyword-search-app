import { CategoryKeywordPanel } from "./category-keyword-panel";

export default function CategoryKeywordsPage() {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">카테고리 대표 키워드</h1>
        <p className="mt-1 text-sm text-zinc-500">
          네이버 블로그 주제판을 선택하면 최근 등록된 글에서 자주 쓰인 키워드를 뽑아
          검색량·문서수·경쟁도를 함께 보여줍니다.
        </p>
      </div>
      <CategoryKeywordPanel />
    </div>
  );
}
