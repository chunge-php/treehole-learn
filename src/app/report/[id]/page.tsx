import { notFound } from "next/navigation";
import { buildReportForSession } from "@/lib/report/build";
import { ReportView } from "@/app/(admin)/assessments/reports/[id]/result/_components/ReportView";

// 公开预览页 (免登录, 独立于后台); middleware 已放行 /report
export const dynamic = "force-dynamic";

export default async function PublicReportPage({ params }: { params: { id: string } }) {
  const data = await buildReportForSession(params.id);
  if (!data || data.status !== "completed") notFound();
  return (
    <div className="min-h-screen bg-slate-100 py-6">
      <ReportView report={data.report} sessionId={params.id} mode="public" />
    </div>
  );
}
