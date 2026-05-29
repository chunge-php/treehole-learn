/**
 * 心愿识别 — 聊天每轮后从对话里识别学生表达的心愿, 写入 student_wish_items。
 *
 * 复用 profile_extract 那条「通用抽取」扣子工作流 (system_prompt 驱动输出 JSON),
 * 换上 wish_extract 提示词即可, 不必新建扣子工作流。
 * 优先读 COZE_WORKFLOW_WISH_EXTRACT, 没配则回落到 COZE_WORKFLOW_PROFILE_EXTRACT。
 *
 * 月底家长信 (buildLetterContext) 已经在读 student_wish_items, 这里写入即自动入信。
 */
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { runWorkflow } from "@/lib/coze/client";
import { shortId } from "@/lib/utils";

const CATEGORIES = ["物质", "体验", "陪伴", "学习目标", "情感诉求"];
const CONTENT_MAX = 60;
// 去重窗口: 最近这么多条已存在心愿里若已有相同内容, 不重复插入 (避免同一心愿反复聊反复记)
const DEDUP_RECENT = 50;

export type MarkedWish = { content: string; category: string };

function normalize(s: string): string {
  return s.replace(/\s+/g, "").replace(/[。.,，、!！?？~～]+$/g, "").toLowerCase();
}

/**
 * 跑一次心愿识别并写库, 返回本轮新标记 (去重后真正入库) 的心愿列表。
 * 任何失败都静默返回 [], 不影响主聊天流程。
 */
export async function runWishExtract(args: {
  endUserId: string;
  userMessage: string;
  assistantMessage: string;
  studentName?: string;
}): Promise<MarkedWish[]> {
  const userMessage = (args.userMessage || "").trim();
  if (!userMessage) return [];   // 纯看图/空发言, 没学生原话可识别

  const workflowId = process.env.COZE_WORKFLOW_WISH_EXTRACT
    || process.env.COZE_WORKFLOW_PROFILE_EXTRACT
    || "";
  if (!workflowId) return [];

  const sb = adminSupabase();
  const { data: tpl } = await sb.from("prompt_templates")
    .select("system_role").eq("code", "wish_extract").eq("is_active", true).maybeSingle();
  if (!tpl?.system_role) return [];

  // 解析扣子输出
  let wishes: MarkedWish[] = [];
  try {
    const res = await runWorkflow({
      workflowId,
      parameters: {
        system_prompt: tpl.system_role,
        student_name: args.studentName || "",
        user_message: userMessage,
        assistant_message: args.assistantMessage || ""
      }
    });
    let raw: any = res.data;
    if (raw && typeof raw === "object" && "output" in raw) raw = (raw as any).output;
    let parsed: any = null;
    if (typeof raw === "string") {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      try { parsed = JSON.parse(cleaned); } catch {}
    } else if (raw && typeof raw === "object") {
      parsed = raw;
    }
    const arr = Array.isArray(parsed?.wishes) ? parsed.wishes : (Array.isArray(parsed) ? parsed : []);
    wishes = arr
      .map((w: any) => ({
        content: String(w?.content ?? w?.心愿 ?? "").trim().slice(0, CONTENT_MAX),
        category: CATEGORIES.includes(String(w?.category ?? "")) ? String(w.category) : "情感诉求"
      }))
      .filter((w: MarkedWish) => w.content.length > 0);
  } catch (e: any) {
    console.error("[wish-extract] workflow call failed:", e?.message || e);
    return [];
  }
  if (wishes.length === 0) return [];

  // 去重: 同一轮内 + 最近已存在条目
  const seen = new Set<string>();
  wishes = wishes.filter(w => {
    const k = normalize(w.content);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const { data: recent } = await sb.from("student_wish_items")
    .select("content")
    .eq("end_user_id", args.endUserId)
    .order("created_at", { ascending: false })
    .limit(DEDUP_RECENT);
  const existing = new Set((recent || []).map((r: any) => normalize(String(r.content || ""))));
  const fresh = wishes.filter(w => !existing.has(normalize(w.content)));
  if (fresh.length === 0) return [];

  // 取学生归属链做隔离字段
  const { data: stu } = await sb.from("end_users")
    .select("channel_id, store_id").eq("id", args.endUserId).maybeSingle();

  const rows = fresh.map(w => ({
    id: shortId("wi"),
    end_user_id: args.endUserId,
    channel_id: (stu as any)?.channel_id ?? null,
    store_id:   (stu as any)?.store_id ?? null,
    content: w.content,
    category: w.category,
    source: "ai_chat",
    source_message: userMessage.slice(0, 500)
  }));
  const { error } = await sb.from("student_wish_items").insert(rows);
  if (error) {
    console.error("[wish-extract] insert failed:", error.message);
    return [];
  }
  return fresh;
}
