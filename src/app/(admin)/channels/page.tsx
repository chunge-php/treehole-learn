import { listChannels, listChannelLevels } from "./actions";
import { ChannelsClient } from "./_components/ChannelsClient";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function ChannelsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const [{ rows, total }, levels] = await Promise.all([
    listChannels({ q, page, pageSize: 20 }),
    listChannelLevels()
  ]);

  return (
    <div>
      <PageHeader
        title="渠道商"
        description="管理平台旗下所有渠道商，含归属地区、联系人与状态"
      />
      <ChannelsClient initialRows={rows} initialTotal={total} initialQ={q} initialPage={page} levels={levels} />
    </div>
  );
}
