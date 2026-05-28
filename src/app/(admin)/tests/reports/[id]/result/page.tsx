import { notFound, redirect } from "next/navigation";
import { getReportSessionDetail, generateSessionReport } from "../../actions";
import { requireAdmin } from "@/lib/auth";
import { ReportView } from "./_components/ReportView";

export default async function ReportResultPage({ params }: { params: { id: string } }) {
  requireAdmin();
  const detail = await getReportSessionDetail(params.id);
  if (!detail) notFound();
  // 未答完不能查看报告
  if (detail.session.status !== "completed") {
    redirect(`/tests/reports/${params.id}`);
  }
  const report = await generateSessionReport(params.id);
  if (!report) notFound();

  return (
    <div className="py-2">
      <ReportView report={report} sessionId={params.id} />
    </div>
  );
}
