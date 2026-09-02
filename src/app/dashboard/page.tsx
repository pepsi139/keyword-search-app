import { SearchPanel } from "./search-panel";

export default function DashboardPage() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-semibold">키워드 검색량 비교</h1>
      <SearchPanel />
    </div>
  );
}
