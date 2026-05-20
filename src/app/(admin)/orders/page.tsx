import { listOrders } from "./actions";
import { OrdersClient } from "./_components/OrdersClient";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function OrdersPage({ searchParams }: { searchParams: { q?: string; page?: string; pay_status?: string } }) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const pay_status = searchParams.pay_status || "";
  const { rows, total } = await listOrders({ q, page, pay_status, pageSize: 20 });

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
      />
    </div>
  );
}
