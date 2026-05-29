/**
 * POST /api/app/ai/chat — 学生 AI 聊天 SSE 流式接口
 *
 *  header: Authorization: Bearer <token>
 *  body:   { user_message: string, image_url?: string, history?: [{role,content}] }
 *  resp:   text/event-stream (SSE)
 *
 * SSE 事件:
 *   event: delta  data: { text: string }       AI 回复的增量文本
 *   event: done   data: { full: string }       本次完整回复
 *   event: error  data: { message: string }    错误信息
 *
 * 跟测试中心 /api/admin/coze-chat 的差异:
 *  - 鉴权: app-session Bearer Token (而非 admin cookie)
 *  - 学生 id 从 token 拿, 不从 body 传
 *  - 模板固定用 prompt_templates.code = 'multimodal_ai_tutor' (不让学生选)
 *  - **不推 profile_updated 事件**: 学生不该看到"档案已更新"系统提示,
 *    档案在后台静默更新 (memory feature_ai_chat 已记)
 */
import { NextRequest } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { streamWorkflow, runWorkflow, uploadFileToCoze, extractWorkflowText, isEmptyReply } from "@/lib/coze/client";
import { renderPrompt, updateProfileFromChat, mergeProfileUpdate } from "@/lib/profile/sync";
import { runWishExtract } from "@/lib/profile/wish-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;
  const studentId = auth.payload.student_id;

  const body = await req.json().catch(() => ({} as any));
  const userMessage = String(body?.user_message || "").trim();
  const imageUrl = String(body?.image_url || "").trim();
  const history = Array.isArray(body?.history) ? body.history : [];
  if (!userMessage && !imageUrl) {
    return new Response(
      JSON.stringify({ ok: false, error: "user_message 和 image_url 至少有一个", code: "MISSING_FIELDS" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const workflowId = process.env.COZE_WORKFLOW_AI_TUTOR || "";
  if (!workflowId) {
    return new Response(
      JSON.stringify({ ok: false, error: "未配置 COZE_WORKFLOW_AI_TUTOR", code: "SERVER_NOT_READY" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 渲染 system_prompt (固定用 multimodal_ai_tutor 模板 + 当前学生档案)
  let systemPrompt = "";
  let studentName = "";
  try {
    const sb = adminSupabase();
    const [{ data: tpl }, { data: eu }, { data: prof }] = await Promise.all([
      sb.from("prompt_templates").select("system_role, prefix_template, rules").eq("code", "multimodal_ai_tutor").eq("is_active", true).maybeSingle(),
      sb.from("end_users").select("id, name, grade").eq("id", studentId).maybeSingle(),
      sb.from("user_profiles").select("*").eq("end_user_id", studentId).maybeSingle()
    ]);
    if (!tpl) {
      return new Response(
        JSON.stringify({ ok: false, error: "AI 模板未配置 (multimodal_ai_tutor)", code: "SERVER_NOT_READY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!eu) {
      return new Response(
        JSON.stringify({ ok: false, error: "学生不存在", code: "NOT_FOUND" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    studentName = (eu as any).name as string;
    const prefix_rendered = renderPrompt((tpl as any).prefix_template, prof, eu);
    systemPrompt = [
      (tpl as any).system_role || "",
      prefix_rendered,
      (tpl as any).rules || ""
    ].filter(Boolean).join("\n\n");
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: `渲染提示词失败: ${e?.message || e}`, code: "PROMPT_BUILD_FAILED" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 历史对话拼字符串
  const historyText = (history as any[])
    .filter(m => m && (m.role === "user" || m.role === "assistant") && m.content)
    // 丢掉历史里的空 JSON 占位 ({}/[]) 助手回复, 防止旧脏数据再次污染多轮
    .filter(m => !(m.role === "assistant" && isEmptyReply(String(m.content))))
    .map(m => (m.role === "user" ? "学生: " : "导师: ") + m.content)
    .join("\n\n");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`));
      };
      let full = "";
      try {
        // 图片处理: URL → 后端 fetch → 上传扣子拿 file_id → object_string 格式
        let cozeImageParam: any = undefined;
        if (imageUrl) {
          const fileRes = await fetch(imageUrl);
          if (!fileRes.ok) throw new Error(`后端拉取图片失败 [${fileRes.status}]: ${imageUrl}`);
          const blob = await fileRes.blob();
          const filename = imageUrl.split("/").pop()?.split("?")[0] || "image.png";
          const { file_id } = await uploadFileToCoze(blob, filename);
          cozeImageParam = JSON.stringify({ file_id });
        }

        for await (const evt of streamWorkflow({
          workflowId,
          parameters: {
            system_prompt: systemPrompt,
            user_message: userMessage || "(看图说话)",
            history: historyText,
            student_name: studentName,
            ...(cozeImageParam ? { image_url: cozeImageParam } : {})
          }
        })) {
          if (evt.type === "delta" || evt.type === "message") {
            // 跳过纯空 JSON 占位 ({}/[]), 扣子多轮中间节点常吐, 不该进回复 (会污染 history 滚雪球)
            if (isEmptyReply(evt.text)) continue;
            full += evt.text;
            send("delta", { text: evt.text });
          } else if (evt.type === "done") {
            if (!full && evt.output) {
              const t = extractWorkflowText(evt.output);   // 安全提取, 绝不 JSON.stringify 对象
              if (t) { full = t; send("delta", { text: full }); }
            }
            // 整段为空 / 只剩空 JSON → 报错, 别把 {} 当回复发给学生端
            if (isEmptyReply(full)) {
              send("error", { message: "AI 返回为空, 请重试" });
              controller.close();
              return;
            }
            // 主对话 done 立刻关流, 学生看完回复就能继续聊
            send("done", { full });

            // 后台静默同步学生档案 (不推 profile_updated 给学生端)
            if (full) {
              (async () => {
                try {
                  await updateProfileFromChat({
                    end_user_id: studentId,
                    user_message: userMessage,
                    assistant_message: full,
                    by: null
                  });
                  // 异步抽取档案更新, 失败不影响
                  const sb = adminSupabase();
                  const { data: extractTpl } = await sb.from("prompt_templates")
                    .select("system_role").eq("code", "profile_extract").eq("is_active", true).maybeSingle();
                  const extractWorkflow = process.env.COZE_WORKFLOW_PROFILE_EXTRACT || "";
                  if (extractTpl?.system_role && extractWorkflow) {
                    const res = await runWorkflow({
                      workflowId: extractWorkflow,
                      parameters: {
                        system_prompt: extractTpl.system_role,
                        student_name: studentName,
                        user_message: userMessage,
                        assistant_message: full
                      }
                    });
                    let raw: any = res.data;
                    if (raw && typeof raw === "object" && "output" in raw) raw = (raw as any).output;
                    if (typeof raw === "string") {
                      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
                      try {
                        const parsed = JSON.parse(cleaned);
                        await mergeProfileUpdate({ end_user_id: studentId, update: parsed, by: null });
                      } catch { /* JSON 解析失败静默跳过 */ }
                    }
                  }
                  // 心愿识别 — 静默写入 student_wish_items (学生端不推任何系统提示, 月底打包进家长信)
                  await runWishExtract({
                    endUserId: studentId,
                    userMessage,
                    assistantMessage: full,
                    studentName
                  });
                } catch (e: any) {
                  console.error("[app/ai-chat] 后台档案同步失败:", e?.message || e);
                }
              })();
            }
            controller.close();
            return;
          } else if (evt.type === "error") {
            send("error", { message: evt.message });
            controller.close();
            return;
          }
          // 其他事件 (node / interrupt 等) 忽略
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
