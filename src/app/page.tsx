import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <main className="flex max-w-2xl flex-col items-center gap-6">
        <span className="rounded-full bg-black/[.06] px-3 py-1 text-sm font-medium text-zinc-600 dark:bg-white/[.08] dark:text-zinc-400">
          개발 준비 중
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50 sm:text-4xl">
          키워드 검색량 비교 도구
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          네이버, 구글, 유튜브의 키워드 검색량과 조회수를 한 화면에서
          비교해주는 마케팅 리서치용 웹 서비스입니다. 콘텐츠 기획과 광고
          키워드 선정을 돕기 위해 개인 프로젝트로 개발 중이며, 현재는 초기
          개발 단계입니다.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          시작하기
        </Link>
      </main>
    </div>
  );
}
