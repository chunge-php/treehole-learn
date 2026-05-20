import { listEndUsers, listStoresForSelect, listChannelsForSelect } from "./actions";
import { EndUsersClient } from "./_components/EndUsersClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { getCurrentSession } from "@/lib/session";

export default async function EndUsersPage({
  searchParams
}: {
  searchParams: { q?: string; page?: string; channel_id?: string; store_id?: string };
}) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const channel_id = searchParams.channel_id || null;
  const store_id = searchParams.store_id || null;
  const session = getCurrentSession();
  const [{ rows, total }, stores, channels] = await Promise.all([
    listEndUsers({ q, channel_id, store_id, page, pageSize: 20 }),
    listStoresForSelect(),
    listChannelsForSelect()
  ]);

  return (
    <div>
      <PageHeader
        title="普通用户"
        description="管理店铺旗下的终端学员，含登录凭证与关联手机号"
      />
      <EndUsersClient
        initialRows={rows}
        initialTotal={total}
        initialQ={q}
        initialPage={page}
        initialChannelId={channel_id}
        initialStoreId={store_id}
        stores={stores as any}
        channels={channels}
        role={session?.role || "channel_admin"}
      />
    </div>
  );
}
