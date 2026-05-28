/**
 * 后台 测试中心 AI 聊天 SSE 转发接口
 * POST /api/admin/coze-chat
 * body: { end_user_id, template_id, user_message, history?: [{role,content}] }
 * resp: text/event-stream (SSE)
 *   event: delta   data: { text }
 *   event: done    data: { full }
 *   event: error   data: { message }
 */
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { streamWorkflow } from "@/lib/coze/client";
import { buildSystemPrompt } from "@/app/(admin)/tests/ai-chat/actions";
import { updateProfileFromChat } from "@/lib/profile/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let adminId: string | null = null;
  try {
    const s = requireAdmin();
    adminId = (s as any).account_id || null;
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "未登录" }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  }

  const body = await req.json().catch(() => ({} as any));
  const endUserId = String(body.end_user_id || "");
  const templateId = String(body.template_id || "");
  const userMessage = String(body.user_message || "");
  const history = Array.isArray(body.history) ? body.history : [];
  if (!endUserId || !templateId || !userMessage) {
    return new Response("缺少 end_user_id / template_id / user_message", { status: 400 });
  }

  const workflowId = process.env.COZE_WORKFLOW_AI_TUTOR || "";
  if (!workflowId) {
    return new Response("未配置 COZE_WORKFLOW_AI_TUTOR", { status: 500 });
  }

  // 渲染 system prompt
  let systemPrompt = "";
  let studentName = "";
  try {
    const built = await buildSystemPrompt({ end_user_id: endUserId, template_id: templateId });
    systemPrompt = built.full;
    studentName = built.student_name;
  } catch (e: any) {
    return new Response(`渲染提示词失败: ${e?.message || e}`, { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`));
      };
      let full = "";
      try {
        // 历史对话拼成文本; 扣子工作流大模型节点 prompt 模板里 {{history}} 引用
        // 扣子开始节点 history 字段需配为 String 类型
        const historyText = (history as any[])
          .filter(m => m && (m.role === "user" || m.role === "assistant") && m.content)
          .map(m => (m.role === "user" ? "学生: " : "导师: ") + m.content)
          .join("\n\n");
        for await (const evt of streamWorkflow({
          workflowId,
          parameters: {
            system_prompt: systemPrompt,
            user_message: userMessage,
            history: historyText,
            student_name: studentName,
          }
        })) {
          if (evt.type === "delta") {
            full += evt.text;
            send("delta", { text: evt.text });
          } else if (evt.type === "message") {
            full += evt.text;
            send("delta", { text: evt.text });
          } else if (evt.type === "done") {
            // 如果工作流最终 output 是字符串而中途没推 delta, 用 output 兜底
            if (!full && evt.output) {
              const t = typeof evt.output === "string" ? evt.output
                : (evt.output?.output || evt.output?.answer || JSON.stringify(evt.output));
              full = String(t);
              send("delta", { text: full });
            }
            send("done", { full });
            // fire-and-forget 回写学生档案 (失败不影响响应)
            if (full) {
              updateProfileFromChat({
                end_user_id: endUserId,
                user_message: userMessage,
                assistant_message: full,
                by: adminId
              }).catch(e => console.error("[ai-chat] profile sync failed:", e?.message || e));
            }
            controller.close();
            return;
          } else if (evt.type === "error") {
            send("error", { message: evt.message });
            controller.close();
            return;
          } else if (evt.type === "node") {
            send("node", { id: evt.nodeId, name: evt.nodeName });
          }
          // interrupt / other: 暂忽略
        }
        // 流自然结束
        send("done", { full });
        controller.close();
      } catch (e: any) {
        send("error", { message: e?.message || String(e) });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
