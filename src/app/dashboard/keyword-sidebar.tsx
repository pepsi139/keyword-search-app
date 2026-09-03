type RelatedKeyword = { keyword: string; pcCount: number; mobileCount: number };

const numberFormat = new Intl.NumberFormat("ko-KR");

export function KeywordSidebar({
  suggestions,
  suggestLoading,
  relatedKeywords,
  onSelect,
  showRelated = true,
}: {
  suggestions: string[] | null;
  suggestLoading: boolean;
  relatedKeywords: RelatedKeyword[];
  onSelect: (term: string) => void;
  showRelated?: boolean;
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-64">
      <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
        <h3 className="mb-3 text-sm font-semibold text-zinc-500">
          유튜브 자동완성 검색어
        </h3>
        {suggestLoading ? (
          <p className="text-sm text-zinc-400">불러오는 중...</p>
        ) : suggestions && suggestions.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => onSelect(s)}
                  className="w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-400">데이터 없음</p>
        )}
      </div>

      {showRelated && (
        <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
          <h3 className="mb-3 text-sm font-semibold text-zinc-500">연관 검색어</h3>
          {relatedKeywords.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {relatedKeywords.map((rk) => (
                <li key={rk.keyword}>
                  <button
                    type="button"
                    onClick={() => onSelect(rk.keyword)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                  >
                    <span className="truncate">{rk.keyword}</span>
                    <span className="shrink-0 pl-2 text-xs text-zinc-400">
                      {numberFormat.format(rk.pcCount + rk.mobileCount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-400">연관 검색어 없음</p>
          )}
        </div>
      )}
    </aside>
  );
}
