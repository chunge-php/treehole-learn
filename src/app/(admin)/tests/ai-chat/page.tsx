import { bootstrapChat } from "./actions";
import { AiChatClient } from "./_components/AiChatClient";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/lib/auth";

export default async function AiChatPage() {
  requireAdmin();
  const data = await bootstrapChat();
  return (
    <div>
      <PageHeader
        title="AI 聊天 — 调试"
        description="浏览器版扣子工作流联调: 选学生 + 选模板 → 实时渲染 system_prompt → 流式调用扣子工作流, 验证后再抛 App 端 SSE 接口"
      />
      <AiChatClient data={data} />
    </div>
  );
}
