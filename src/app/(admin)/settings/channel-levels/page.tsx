import { listChannelLevels } from "./actions";
import { Client } from "./_components/Client";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function ChannelLevelsPage() {
  const rows = await listChannelLevels();
  return (
    <div>
      <PageHeader
        title="渠道级别"
        description="维护渠道商分级字典，用于渠道商表单的级别下拉"
      />
      <Client initialRows={rows} />
    </div>
  );
}
