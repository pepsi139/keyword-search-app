import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { NavLinks } from "./nav-links";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <nav className="flex items-center justify-between border-b border-black/[.08] px-6 py-3 dark:border-white/[.12]">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="text-blue-600 dark:text-blue-400"
            >
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
            </svg>
            <span className="text-lg font-medium tracking-tight">
              Keyword
              <span className="text-blue-600 dark:text-blue-400">Radar</span>
            </span>
          </div>
          <NavLinks />
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-black/[.12] px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.16] dark:hover:bg-white/[.06]"
          >
            로그아웃
          </button>
        </form>
      </nav>
      <main className="flex flex-1 flex-col items-center gap-10 px-6 py-12">
        {children}
      </main>
    </div>
  );
}
