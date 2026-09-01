import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNaverSearchVolume } from "@/lib/naver";
import { getYoutubeStats } from "@/lib/youtube";
import { getGoogleSearchVolume } from "@/lib/google-ads";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { keyword?: string } | null;
  const keyword = body?.keyword?.trim();

  if (!keyword) {
    return NextResponse.json({ error: "키워드를 입력해주세요." }, { status: 400 });
  }

  const [naverResult, youtubeResult, googleResult] = await Promise.allSettled([
    getNaverSearchVolume(keyword),
    getYoutubeStats(keyword),
    getGoogleSearchVolume(keyword),
  ]);

  return NextResponse.json({
    keyword,
    naver: naverResult.status === "fulfilled" ? naverResult.value : null,
    naverError: naverResult.status === "rejected" ? String(naverResult.reason) : null,
    youtube: youtubeResult.status === "fulfilled" ? youtubeResult.value : null,
    youtubeError:
      youtubeResult.status === "rejected" ? String(youtubeResult.reason) : null,
    google: googleResult.status === "fulfilled" ? googleResult.value : null,
  });
}
