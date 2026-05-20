import { listOrders } from "./actions";
import { OrdersClient } from "./_components/OrdersClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { adminSupabase } from "@/lib/supabase/admin";

export default async function OrdersPage({
  searchParams
}: {
  searchParams: { q?: string; page?: string; pay_status?: string; channel_id?: string; store_id?: string };
}) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const pay_status = searchParams.pay_status || "";
  const channel_id = searchParams.channel_id || null;
  const store_id = searchParams.store_id || null;
  const { rows, total } = await listOrders({ q, page, pay_status, channel_id, store_id, pageSize: 20 });

  let channelName: string | null = null;
  let storeName: string | null = null;
  if (channel_id || store_id) {
    const sb = adminSupabase();
    const tasks: Promise<any>[] = [];
    if (channel_id) tasks.push(sb.from("channels").select("name").eq("id", channel_id).maybeSingle());
    if (store_id) tasks.push(sb.from("stores").select("name").eq("id", store_id).maybeSingle());
    const results = await Promise.all(tasks);
    let idx = 0;
    if (channel_id) channelName = results[idx++].data?.name || null;
    if (store_id) storeName = results[idx++].data?.name || null;
  }

  return (
    <div>
      <PageHeader
        title="订单"
        description="查看平台所有测评订单流水，仅支持查看与导出"
      />
      <OrdersClient
        initialRows={rows}
        initialTotal={total}
        initialQ={q}
        initialPage={page}
        initialPayStatus={pay_status}
        initialChannelId={channel_id}
        initialChannelName={channelName}
        initialStoreId={store_id}
        initialStoreName={storeName}
      />
    </div>
  );
}
