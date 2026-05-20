import { listOrders } from "./actions";
import { OrdersClient } from "./_components/OrdersClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { adminSupabase } from "@/lib/supabase/admin";

export default async function OrdersPage({
  searchParams
}: {
  searchParams: { q?: string; page?: string; pay_status?: string; channel_id?: string };
}) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const pay_status = searchParams.pay_status || "";
  const channel_id = searchParams.channel_id || null;
  const { rows, total } = await listOrders({ q, page, pay_status, channel_id, pageSize: 20 });

  let channelName: string | null = null;
  if (channel_id) {
    const sb = adminSupabase();
    const { data } = await sb.from("channels").select("name").eq("id", channel_id).maybeSingle();
    channelName = data?.name || null;
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
      />
    </div>
  );
}
