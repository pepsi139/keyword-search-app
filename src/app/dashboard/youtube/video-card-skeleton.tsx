export function VideoCardSkeleton() {
  return (
    <div className="flex animate-pulse gap-4 rounded-lg border border-black/[.08] p-4 dark:border-white/[.12]">
      <div className="h-20 w-32 shrink-0 rounded-md bg-black/[.08] dark:bg-white/[.1]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
        <div className="h-4 w-3/4 rounded bg-black/[.08] dark:bg-white/[.1]" />
        <div className="h-3 w-1/2 rounded bg-black/[.06] dark:bg-white/[.08]" />
        <div className="mt-1 h-3 w-2/3 rounded bg-black/[.06] dark:bg-white/[.08]" />
      </div>
    </div>
  );
}
