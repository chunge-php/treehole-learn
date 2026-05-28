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
import { streamWorkflow, runWorkflow, uploadFileToCoze } from "@/lib/coze/client";
import { buildSystemPrompt } from "@/app/(admin)/tests/ai-chat/actions";
import { updateProfileFromChat, mergeProfileUpdate } from "@/lib/profile/sync";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 调用扣子第二个工作流抽取学生档案更新, 合并到 user_profiles, 返回变更的字段路径列表 */
async function runProfileExtract(args: {
  endUserId: string;
  userMessage: string;
  assistantMessage: string;
  adminId: string | null;
}): Promise<string[]> {
  const workflowId = process.env.COZE_WORKFLOW_PROFILE_EXTRACT || "";
  if (!workflowId) return [];      // 未配置 → 跳过, 不报错

  const sb = adminSupabase();
  // 取模板的 system_role 作为分析 prompt
  const { data: tpl } = await sb.from("prompt_templates")
    .select("system_role").eq("code", "profile_extract").eq("is_active", true).maybeSingle();
  if (!tpl?.system_role) return [];  // 没模板 → 跳过

  // 取学生名
  const { data: eu } = await sb.from("end_users")
    .select("name").eq("id", args.endUserId).maybeSingle();

  let parsed: any = null;
  try {
    const res = await runWorkflow({
      workflowId,
      parameters: {
        system_prompt: tpl.system_role,
        student_name: (eu as any)?.name || "",
        user_message: args.userMessage,
        assistant_message: args.assistantMessage
      }
    });
    // 扣子返回 data 已被 client 解析过一层, 此处 data 可能是 {output: "..."} 或 {output: {...}}
    let raw: any = res.data;
    if (raw && typeof raw === "object" && "output" in raw) raw = (raw as any).output;
    if (typeof raw === "string") {
      // 去掉可能的 ```json ... ``` 包裹
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      try { parsed = JSON.parse(cleaned); } catch {}
    } else if (raw && typeof raw === "object") {
      parsed = raw;
    }
  } catch (e: any) {
    console.error("[profile-extract] workflow call failed:", e?.message || e);
    return [];
  }
  if (!parsed) return [];

  try {
    return await mergeProfileUpdate({
      end_user_id: args.endUserId,
      update: parsed,
      by: args.adminId
    });
  } catch (e: any) {
    console.error("[profile-extract] merge failed:", e?.message || e);
    return [];
  }
}

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
  const imageUrl = String(body.image_url || "");
  const history = Array.isArray(body.history) ? body.history : [];
  if (!endUserId || !templateId || (!userMessage && !imageUrl)) {
    return new Response("缺少 end_user_id / template_id, user_message 和 image_url 至少有一个", { status: 400 });
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
        // 图片处理: 本地/内网 URL 扣子云端 fetch 不到, 先后端 fetch → 上传到扣子拿 file_id
        // (无论本地 localhost / 内网 192.x / 公网 URL 都统一走这条路, 简单一致)
        let cozeImageParam: any = undefined;
        if (imageUrl) {
          const fileRes = await fetch(imageUrl);
          if (!fileRes.ok) throw new Error(`后端拉取图片失败 [${fileRes.status}]: ${imageUrl}`);
          const blob = await fileRes.blob();
          const filename = imageUrl.split("/").pop()?.split("?")[0] || "image.png";
          const { file_id } = await uploadFileToCoze(blob, filename);
          cozeImageParam = JSON.stringify({ file_id });   // 扣子 File 字段 object_string 格式
        }

        for await (const evt of streamWorkflow({
          workflowId,
          parameters: {
            system_prompt: systemPrompt,
            user_message: userMessage || "(看图说话)",
            history: historyText,
            student_name: studentName,
            ...(cozeImageParam ? { image: cozeImageParam } : {})
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

            // 立刻推 done → 前端解禁输入框, 用户可继续发言
            send("done", { full });

            // 档案写入异步后台跑, 完成后再推 profile_updated 然后关流。
            // queue.ts 已经保证同学生写入串行, 不必担心数据竞争。
            if (full) {
              (async () => {
                try {
                  await updateProfileFromChat({
                    end_user_id: endUserId,
                    user_message: userMessage,
                    assistant_message: full,
                    by: adminId
                  });
                  const changedFields = await runProfileExtract({
                    endUserId, userMessage, assistantMessage: full, adminId
                  });
                  if (changedFields.length > 0) {
                    try { send("profile_updated", { fields: changedFields }); }
                    catch { /* 前端可能已断开, 静默 */ }
                  }
                } catch (e: any) {
                  console.error("[ai-chat] post-stream sync error:", e?.message || e);
                } finally {
                  try { controller.close(); } catch { /* 已关 */ }
                }
              })();
            } else {
              controller.close();
            }
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
