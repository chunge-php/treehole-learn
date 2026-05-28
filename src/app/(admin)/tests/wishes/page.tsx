import { listStudentsForLetter, getLetterTemplateMeta } from "./actions";
import { WishLetterTesterClient } from "./_components/WishLetterTesterClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/lib/auth";

export default async function WishLetterTestPage() {
  requireAdmin();
  const [students, template] = await Promise.all([
    listStudentsForLetter(),
    getLetterTemplateMeta().catch(() => null)
  ]);
  const now = new Date();
  return (
    <div>
      <PageHeader
        title="月度家长信 — 调试"
        description="按甲方提示词 (孩子第一人称, 300-400 字, 五大维度) 生成月度家长信。挂载学生档案数据为上下文, 调扣子工作流 (COZE_WORKFLOW_WISH_LETTER) 出文。可保存到 student_wishes 表, 家长小程序心愿清单立刻能看到。"
      />
      <WishLetterTesterClient
        students={students}
        defaultYear={now.getFullYear()}
        defaultMonth={now.getMonth() + 1}
        defaultTemplate={template}
      />
    </div>
  );
}
