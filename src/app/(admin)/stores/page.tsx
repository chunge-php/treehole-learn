import { listStores, listChannelsForSelect } from "./actions";
import { StoresClient } from "./_components/StoresClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { getCurrentSession } from "@/lib/session";

export default async function StoresPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const session = getCurrentSession();
  const [{ rows, total }, channels] = await Promise.all([
    listStores({ q, page, pageSize: 20 }),
    listChannelsForSelect()
  ]);

  return (
    <div>
      <PageHeader
        title="店铺"
        description="管理渠道商旗下的所有店铺，含归属地区、联系人、设备数与状态"
      />
      <StoresClient
        initialRows={rows}
        initialTotal={total}
        initialQ={q}
        initialPage={page}
        channels={channels}
        role={session?.role || "channel_admin"}
      />
    </div>
  );
}
