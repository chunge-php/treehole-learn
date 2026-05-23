import { listAgreements } from "./actions";
import { Client } from "./_components/Client";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AgreementsPage() {
  const rows = await listAgreements();
  return (
    <div>
      <PageHeader
        title="协议管理"
        description="维护小程序的用户服务协议与隐私政策，保存后小程序登录页即时生效"
      />
      <Client initialRows={rows} />
    </div>
  );
}
