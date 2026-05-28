import { listPromptTemplates } from "./actions";
import { PromptTemplatesClient } from "./_components/PromptTemplatesClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/lib/auth";

export default async function PromptTemplatesPage() {
  requireAdmin();
  const rows = await listPromptTemplates();
  return (
    <div>
      <PageHeader
        title="提示词模板"
        description="全局共享, 多模态测评/AI 解读等场景调用; 模板中 {{占位符}} 在调用时由学生档案填充"
      />
      <PromptTemplatesClient initialRows={rows} />
    </div>
  );
}
