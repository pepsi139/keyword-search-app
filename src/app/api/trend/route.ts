import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSearchTrend, type NaverTimeUnit } from "@/lib/naver-datalab";
import { getGoogleTrendsInterest } from "@/lib/google-trends";

const PERIOD_CONFIG: Record<
  string,
  { timeUnit: NaverTimeUnit; days: number; googleTimeframe: string }
> = {
  day: { timeUnit: "date", days: 90, googleTimeframe: "now 7-d" },
  week: { timeUnit: "week", days: 365, googleTimeframe: "today 3-m" },
  month: { timeUnit: "month", days: 730, googleTimeframe: "today 12-m" },
  year: { timeUnit: "month", days: 1825, googleTimeframe: "today 5-y" },
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

  const [naverResult, googleResult] = await Promise.allSettled([
    getSearchTrend(keyword, formatDate(start), formatDate(end), config.timeUnit),
    getGoogleTrendsInterest(keyword, config.googleTimeframe),
  ]);

  return NextResponse.json({
    keyword,
    period,
    naver: naverResult.status === "fulfilled" ? naverResult.value : [],
    naverError: naverResult.status === "rejected" ? String(naverResult.reason) : null,
    google: googleResult.status === "fulfilled" ? googleResult.value : [],
    googleError: googleResult.status === "rejected" ? String(googleResult.reason) : null,
  });
}
