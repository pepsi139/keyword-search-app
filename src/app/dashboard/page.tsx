import { createClient } from "@/lib/supabase/server";
import { SearchPanel } from "./search-panel";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 지식iN 도구는 소유자 PC의 로컬 서버라 소유자 계정에만 연결 버튼을 노출
  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase();
  const isOwner = Boolean(ownerEmail && user?.email?.toLowerCase() === ownerEmail);
  const kinToolUrl = isOwner ? (process.env.KIN_TOOL_URL ?? null) : null;

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <SearchPanel kinToolUrl={kinToolUrl} />
    </div>
  );
}
