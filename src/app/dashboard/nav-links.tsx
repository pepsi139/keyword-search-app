"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "키워드 검색량 비교" },
  { href: "/dashboard/youtube", label: "유튜브" },
  { href: "/dashboard/category-keywords", label: "카테고리 대표 키워드" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-black/[.06] text-black dark:bg-white/[.1] dark:text-white"
                : "text-zinc-500 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/[.06]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
