import { listEndUsers, listStoresForSelect } from "./actions";
import { EndUsersClient } from "./_components/EndUsersClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { adminSupabase } from "@/lib/supabase/admin";

export default async function EndUsersPage({
  searchParams
}: {
  searchParams: { q?: string; page?: string; channel_id?: string; store_id?: string };
}) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const channel_id = searchParams.channel_id || null;
  const store_id = searchParams.store_id || null;
  const [{ rows, total }, stores] = await Promise.all([
    listEndUsers({ q, channel_id, store_id, page, pageSize: 20 }),
    listStoresForSelect()
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
        title="普通用户"
        description="管理店铺旗下的终端学员，含基础信息、家长联系方式与付费金额"
      />
      <EndUsersClient
        initialRows={rows}
        initialTotal={total}
        initialQ={q}
        initialPage={page}
        initialChannelId={channel_id}
        initialChannelName={channelName}
        initialStoreId={store_id}
        stores={stores as any}
      />
    </div>
  );
}
