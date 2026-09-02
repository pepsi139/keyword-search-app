import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSearchTrend, type NaverTimeUnit } from "@/lib/naver-datalab";

const PERIOD_CONFIG: Record<string, { timeUnit: NaverTimeUnit; days: number }> = {
  day: { timeUnit: "date", days: 90 },
  week: { timeUnit: "week", days: 365 },
  month: { timeUnit: "month", days: 730 },
  year: { timeUnit: "month", days: 1825 },
};

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { keyword?: string; period?: string }
    | null;
  const keyword = body?.keyword?.trim();
  const period = body?.period && PERIOD_CONFIG[body.period] ? body.period : "month";
  const config = PERIOD_CONFIG[period];

  if (!keyword) {
    return NextResponse.json({ error: "키워드를 입력해주세요." }, { status: 400 });
  }

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - config.days);

  try {
    const data = await getSearchTrend(
      keyword,
      formatDate(start),
      formatDate(end),
      config.timeUnit,
    );
    return NextResponse.json({ keyword, period, data });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "트렌드 조회 중 오류가 발생했습니다.",
      },
      { status: 502 },
    );
  }
}
