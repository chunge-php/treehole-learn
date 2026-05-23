import { listFeedback } from "./actions";
import { Client } from "./_components/Client";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function FeedbackPage() {
  const rows = await listFeedback();
  return (
    <div>
      <PageHeader
        title="用户反馈"
        description="家长端小程序提交的问题与建议，可标记处理或删除"
      />
      <Client initialRows={rows} />
    </div>
  );
}
