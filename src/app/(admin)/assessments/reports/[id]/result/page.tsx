import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getReportSessionDetail } from "../../actions";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Construction } from "lucide-react";

export default async function ReportResultPage({ params }: { params: { id: string } }) {
  requireAdmin();
  const detail = await getReportSessionDetail(params.id);
  if (!detail) notFound();
  const { session, questions, answers } = detail;

  // 未答完不能查看/生成报告
  if (session.status !== "completed") {
    redirect(`/assessments/reports/${params.id}`);
  }

  // 维度作答分布 (占位统计, 等接入正式报告逻辑后替换)
  const byDim: Record<string, { total: number; answered: number }> = {};
  for (const q of questions as any[]) {
    const d = q.dimension || "未分类";
    byDim[d] = byDim[d] || { total: 0, answered: 0 };
    byDim[d].total++;
    if (q.id in answers) byDim[d].answered++;
  }

  return (
    <div>
      <PageHeader
        title={`测评报告 · ${session.name}`}
        description={session.completed_at ? `完成于 ${new Date(session.completed_at).toLocaleString("zh-CN", { hour12: false })}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/assessments/reports"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> 返回列表</Button></Link>
            <Link href={`/assessments/reports/${params.id}`}><Button variant="outline" size="sm">复核作答</Button></Link>
          </div>
        }
      />

      <div className="space-y-4">
        {/* 概览 */}
        <Card className="p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="题目总数" value={session.total_questions} />
            <Stat label="已作答" value={session.answered_count} />
            <Stat label="维度数" value={Object.keys(byDim).length} />
            <Stat label="状态" value={<Badge variant="success">已完成</Badge>} />
          </div>
        </Card>

        {/* 维度分布 */}
        <Card className="p-5 space-y-3">
          <h3 className="font-medium">各维度作答分布</h3>
          <div className="space-y-2">
            {Object.entries(byDim).map(([d, v]) => (
              <div key={d} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0">{d}</span>
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${v.total ? (v.answered / v.total) * 100 : 0}%` }} />
                </div>
                <span className="tabular-nums text-muted-foreground">{v.answered}/{v.total}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 正式报告占位 */}
        <Card className="p-8 text-center space-y-2 border-dashed">
          <Construction className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            正式报告生成逻辑待接入 (等旧系统报告源码)。当前已具备完整作答数据, 接入算法后即可在此渲染最终报告。
          </p>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
