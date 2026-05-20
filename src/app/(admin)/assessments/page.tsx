import { listAssessments, listProjects } from "./actions";
import { AssessmentsClient } from "./_components/AssessmentsClient";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AssessmentsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const [{ rows, total }, projects] = await Promise.all([
    listAssessments({ q, page, pageSize: 20 }),
    listProjects()
  ]);

  return (
    <div>
      <PageHeader
        title="测评题库"
        description="维护四维度学习力测评题，支持单选、多选与简答题型"
      />
      <AssessmentsClient
        initialRows={rows}
        initialTotal={total}
        initialQ={q}
        initialPage={page}
        projects={projects}
      />
    </div>
  );
}
