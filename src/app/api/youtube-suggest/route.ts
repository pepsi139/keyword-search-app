import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getYoutubeSuggestions } from "@/lib/youtube";

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

  try {
    const suggestions = await getYoutubeSuggestions(keyword);
    return NextResponse.json({ keyword, suggestions });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "자동완성 조회 중 오류가 발생했습니다.",
      },
      { status: 502 },
    );
  }
}
