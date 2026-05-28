import { listStudentsForTest, listActivePromptTemplates } from "./actions";
import { MultimodalTesterClient } from "./_components/MultimodalTesterClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/lib/auth";

export default async function MultimodalTestPage() {
  requireAdmin();
  const [students, templates] = await Promise.all([
    listStudentsForTest(),
    listActivePromptTemplates()
  ]);
  return (
    <div>
      <PageHeader
        title="多模态测评 — 调试"
        description="第三方接口未到位前, 本地按文档算法随机生成 11 项分值, 加权出综合分与 15 级状态; 可保存为该学生最新档案以供 AI 解读联调"
      />
      <MultimodalTesterClient students={students} templates={templates} />
    </div>
  );
}
