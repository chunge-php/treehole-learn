import { listMpParents } from "./actions";
import { Client } from "./_components/Client";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function WechatUsersPage() {
  const rows = await listMpParents();
  return (
    <div>
      <PageHeader
        title="微信用户"
        description="家长端小程序登录的微信用户，及其绑定的学员"
      />
      <Client initialRows={rows} />
    </div>
  );
}
