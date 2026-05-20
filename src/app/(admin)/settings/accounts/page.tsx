import { listAccounts, listChannelsForAccount } from "./actions";
import { Client } from "./_components/Client";
import { PageHeader } from "@/components/admin/PageHeader";
import { adminSupabase } from "@/lib/supabase/admin";

export default async function AccountsPage({
  searchParams
}: {
  searchParams: { q?: string; page?: string; role?: string; channel_id?: string };
}) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const role = searchParams.role || "";
  const channel_id = searchParams.channel_id || null;
  const [{ rows, total }, channels] = await Promise.all([
    listAccounts({ q, page, role, channel_id, pageSize: 20 }),
    listChannelsForAccount()
  ]);

  let channelName: string | null = null;
  if (channel_id) {
    const sb = adminSupabase();
    const { data } = await sb.from("channels").select("name").eq("id", channel_id).maybeSingle();
    channelName = data?.name || null;
  }

  return (
    <div>
      <PageHeader
        title="账号管理"
        description="维护后台用户：超级管理员、平台管理员、渠道管理员"
      />
      <Client
        initialRows={rows}
        initialTotal={total}
        initialQ={q}
        initialPage={page}
        initialRole={role}
        initialChannelId={channel_id}
        initialChannelName={channelName}
        channels={channels}
      />
    </div>
  );
}
