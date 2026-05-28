import { listReportSessions } from "./actions";
import { ReportsClient } from "./_components/ReportsClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/lib/auth";

export default async function ReportsPage() {
  requireAdmin();
  const rows = await listReportSessions();
  return (
    <div>
      <PageHeader
        title="测评报告"
        description="新建一条记录后逐题作答, 每答一题即时保存; 答完全部题目方可生成报告, 可中途退出续答"
      />
      <ReportsClient initialRows={rows} />
    </div>
  );
}
