import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNewsTrendingKeywords } from "@/lib/naver-news-trending";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const keywords = await getNewsTrendingKeywords();
    return NextResponse.json({ keywords });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "실시간 인기 키워드 조회 중 오류가 발생했습니다.",
      },
      { status: 502 },
    );
  }
}
