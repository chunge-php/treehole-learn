import Link from "next/link";
import { listAssessments, listProjectNames } from "./actions";
import { AssessmentsClient } from "./_components/AssessmentsClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { FileBarChart } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { isAdminRole } from "@/lib/auth";

export default async function AssessmentsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const session = getCurrentSession();
  const canReports = !!session && isAdminRole(session.role);
  const [{ rows, total }, projectSuggestions] = await Promise.all([
    listAssessments({ q, page, pageSize: 20 }),
    listProjectNames()
  ]);

  return (
    <div>
      <PageHeader
        title="测评题库"
        description="维护测评题, 含 4 大维度与 3 种题型 (单选 / 判断 / 语音), 支持上传题目图片与视频"
        actions={canReports ? (
          <Link href="/tests/reports">
            <Button variant="outline"><FileBarChart className="h-4 w-4" /> 测评报告</Button>
          </Link>
        ) : undefined}
      />
      <AssessmentsClient
        initialRows={rows}
        initialTotal={total}
        initialQ={q}
        initialPage={page}
        projectSuggestions={projectSuggestions}
      />
    </div>
  );
}
