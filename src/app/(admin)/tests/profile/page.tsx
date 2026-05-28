import { listStudents } from "./actions";
import { ProfileViewerClient } from "./_components/ProfileViewerClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/lib/auth";

export default async function StudentProfilePage({ searchParams }: { searchParams: { id?: string } }) {
  requireAdmin();
  const students = await listStudents();
  return (
    <div>
      <PageHeader
        title="学生档案"
        description="按学生汇总: 基础信息 + 测评报告历史 + 多模态最新 + AI 档案各分片 + 更新流水"
      />
      <ProfileViewerClient students={students} initialId={searchParams.id || ""} />
    </div>
  );
}
