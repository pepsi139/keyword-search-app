import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getNaverSearchVolume } from "@/lib/naver";
import { getGoogleSearchVolume } from "@/lib/google-ads";
import { getNaverBlogCount } from "@/lib/naver-blog";

const FREE_SEARCH_COOKIE = "kr_free_searches";
const FREE_SEARCH_LIMIT = 5;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const usedFreeSearches = Number(cookieStore.get(FREE_SEARCH_COOKIE)?.value ?? "0") || 0;

  if (!user && usedFreeSearches >= FREE_SEARCH_LIMIT) {
    return NextResponse.json(
      {
        error: "무료 검색 5회를 모두 사용했습니다. 로그인하시면 계속 이용하실 수 있습니다.",
        limitReached: true,
      },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as { keyword?: string } | null;
  const keyword = body?.keyword?.trim();

  if (!keyword) {
    return NextResponse.json({ error: "키워드를 입력해주세요." }, { status: 400 });
  }

  const [naverResult, googleResult, blogResult] = await Promise.allSettled([
    getNaverSearchVolume(keyword),
    getGoogleSearchVolume(keyword),
    getNaverBlogCount(keyword),
  ]);

  const response = NextResponse.json({
    keyword,
    naver: naverResult.status === "fulfilled" ? naverResult.value : null,
    naverError: naverResult.status === "rejected" ? String(naverResult.reason) : null,
    google: googleResult.status === "fulfilled" ? googleResult.value : null,
    googleError: googleResult.status === "rejected" ? String(googleResult.reason) : null,
    blogCount: blogResult.status === "fulfilled" ? blogResult.value : null,
    freeSearchesLeft: user ? null : Math.max(0, FREE_SEARCH_LIMIT - (usedFreeSearches + 1)),
  });

  if (!user) {
    response.cookies.set(FREE_SEARCH_COOKIE, String(usedFreeSearches + 1), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return response;
}
