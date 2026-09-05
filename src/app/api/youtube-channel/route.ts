import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChannelInfo } from "@/lib/youtube";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { query?: string } | null;
  const query = body?.query?.trim();

  if (!query) {
    return NextResponse.json({ error: "채널명을 입력해주세요." }, { status: 400 });
  }

  try {
    const channel = await getChannelInfo(query);
    if (!channel) {
      return NextResponse.json({ error: "채널을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ channel });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "채널 조회 중 오류가 발생했습니다." },
      { status: 502 },
    );
  }
}
