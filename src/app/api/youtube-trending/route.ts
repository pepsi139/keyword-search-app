import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrendingVideos } from "@/lib/youtube";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const videos = await getTrendingVideos();
    return NextResponse.json({ videos });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "인기 급상승 조회 중 오류가 발생했습니다.",
      },
      { status: 502 },
    );
  }
}
