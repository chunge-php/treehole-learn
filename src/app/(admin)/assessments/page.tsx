import { listAssessments, listProjectNames } from "./actions";
import { AssessmentsClient } from "./_components/AssessmentsClient";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AssessmentsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const [{ rows, total }, projectSuggestions] = await Promise.all([
    listAssessments({ q, page, pageSize: 20 }),
    listProjectNames()
  ]);

  return (
    <div>
      <PageHeader
        title="测评题库"
        description="维护测评题, 含 4 大维度与 3 种题型 (单选 / 判断 / 语音), 支持上传题目图片与视频"
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
