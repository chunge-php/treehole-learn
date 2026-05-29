/**
 * 心愿识别 — 学生表达的心愿写入 student_wish_items, 月底打包成家长信。
 *
 * 当前做法 (甲方定): 心愿**合进档案抽取工作流**输出 —— profile_extract 工作流在
 * 原档案 JSON 基础上额外吐一个 `wishes` 数组, 后端 (extract.ts) 把它拆出来调
 * persistWishes 写库。不再单独调一次扣子工作流。
 *
 * runWishExtract (独立调一条 wish 工作流) 保留作备选, 仅当配了 COZE_WORKFLOW_WISH_EXTRACT
 * 且建了独立工作流时才用; 默认路径走 extract.ts 的合并方案。
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
export type WishExtractResult = { marked: MarkedWish[]; note: string };

function normalize(s: string): string {
  return s.replace(/\s+/g, "").replace(/[。.,，、!！?？~～]+$/g, "").toLowerCase();
}

/** 把任意 parsed JSON 里的 wishes 数组规整成 MarkedWish[] (容错: wishes 键 / 直接数组 / 中文键) */
export function parseWishes(parsed: any): MarkedWish[] {
  const arr = Array.isArray(parsed?.wishes) ? parsed.wishes
    : (Array.isArray(parsed?.心愿) ? parsed.心愿 : (Array.isArray(parsed) ? parsed : []));
  return arr
    .map((w: any) => ({
      content: String(w?.content ?? w?.心愿 ?? w?.内容 ?? (typeof w === "string" ? w : "")).trim().slice(0, CONTENT_MAX),
      category: CATEGORIES.includes(String(w?.category ?? "")) ? String(w.category) : "情感诉求"
    }))
    .filter((w: MarkedWish) => w.content.length > 0);
}

/** 去重 (同轮内 + 最近已有) 后写入 student_wish_items, 返回真正入库的心愿 + 友好状态。供 extract.ts 合并方案复用。 */
export async function persistWishes(args: {
  endUserId: string;
  wishes: MarkedWish[];
  sourceMessage?: string;
}): Promise<WishExtractResult> {
  let wishes = args.wishes || [];
  if (wishes.length === 0) return { marked: [], note: "本轮未识别到心愿" };

  const sb = adminSupabase();
  // 同轮去重
  const seen = new Set<string>();
  wishes = wishes.filter(w => {
    const k = normalize(w.content);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // 跟最近已有去重
  const { data: recent } = await sb.from("student_wish_items")
    .select("content")
    .eq("end_user_id", args.endUserId)
    .order("created_at", { ascending: false })
    .limit(DEDUP_RECENT);
  const existing = new Set((recent || []).map((r: any) => normalize(String(r.content || ""))));
  const fresh = wishes.filter(w => !existing.has(normalize(w.content)));
  if (fresh.length === 0) return { marked: [], note: `识别到 ${wishes.length} 个但都跟最近已有心愿重复, 已跳过` };

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
    source_message: (args.sourceMessage || "").slice(0, 500)
  }));
  const { error } = await sb.from("student_wish_items").insert(rows);
  if (error) {
    console.error("[wish-extract] insert failed:", error.message);
    return { marked: [], note: `写库失败: ${error.message}` };
  }
  return { marked: fresh, note: `已记录 ${fresh.length} 个心愿` };
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
}): Promise<WishExtractResult> {
  const userMessage = (args.userMessage || "").trim();
  if (!userMessage) return { marked: [], note: "本轮无学生文字 (纯看图)" };

  const wishEnv = process.env.COZE_WORKFLOW_WISH_EXTRACT || "";
  const profEnv = process.env.COZE_WORKFLOW_PROFILE_EXTRACT || "";
  const workflowId = wishEnv || profEnv || "";
  if (!workflowId) return { marked: [], note: "未配置扣子工作流 (COZE_WORKFLOW_WISH_EXTRACT / PROFILE_EXTRACT)" };

  const sb = adminSupabase();
  const { data: tpl } = await sb.from("prompt_templates")
    .select("system_role").eq("code", "wish_extract").eq("is_active", true).maybeSingle();
  if (!tpl?.system_role) return { marked: [], note: "缺 wish_extract 提示词模板 (migration 35 未跑?)" };

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
    if (parsed && !Array.isArray(parsed?.wishes) && !Array.isArray(parsed)) {
      return { marked: [], note: `工作流输出无 wishes 键 (返回 key: ${Object.keys(parsed).join("/") || "空"}) → 需单独建 wish_extract 工作流` };
    }
    wishes = parseWishes(parsed);
  } catch (e: any) {
    console.error("[wish-extract] workflow call failed:", e?.message || e);
    return { marked: [], note: `扣子调用报错: ${e?.message || e}` };
  }
  return persistWishes({ endUserId: args.endUserId, wishes, sourceMessage: userMessage });
}

/**
 * 心愿识别自测 — 喂一句话, 把每一步都暴露出来, 用于排查"聊天说了心愿却没记录"。
 * 不写库 (insert=false 时), 纯诊断。
 */
export async function debugWishExtract(args: {
  endUserId?: string;
  userMessage: string;
  assistantMessage?: string;
  studentName?: string;
}): Promise<{
  workflowId: string;
  templateFound: boolean;
  rawOutput: any;
  parsedWishes: MarkedWish[];
  steps: string[];
}> {
  const steps: string[] = [];
  const userMessage = (args.userMessage || "").trim();
  // 合并方案: 心愿跟着档案抽取工作流一起出, 所以这里测的就是 profile_extract 工作流 + 模板
  const workflowId = process.env.COZE_WORKFLOW_PROFILE_EXTRACT || "";

  if (!userMessage) steps.push("❌ user_message 为空, 直接跳过 (纯看图等)");
  if (!workflowId) steps.push("❌ 没配 COZE_WORKFLOW_PROFILE_EXTRACT");
  else steps.push(`✅ 档案抽取工作流 id=${workflowId} (心愿合并在这条里出)`);

  const sb = adminSupabase();
  const { data: tpl } = await sb.from("prompt_templates")
    .select("system_role").eq("code", "profile_extract").eq("is_active", true).maybeSingle();
  const templateFound = !!tpl?.system_role;
  steps.push(templateFound ? "✅ 找到 profile_extract 提示词模板" : "❌ 没找到 profile_extract 模板");

  let rawOutput: any = null;
  let parsedWishes: MarkedWish[] = [];
  if (workflowId && templateFound && userMessage) {
    try {
      const res = await runWorkflow({
        workflowId,
        parameters: {
          system_prompt: tpl!.system_role,
          student_name: args.studentName || "",
          user_message: userMessage,
          assistant_message: args.assistantMessage || ""
        }
      });
      rawOutput = res.data;
      let raw: any = res.data;
      if (raw && typeof raw === "object" && "output" in raw) raw = (raw as any).output;
      let parsed: any = null;
      if (typeof raw === "string") {
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
        try { parsed = JSON.parse(cleaned); } catch { steps.push("⚠️ 扣子返回的是字符串但不是合法 JSON"); }
      } else if (raw && typeof raw === "object") {
        parsed = raw;
      }
      const hasWishKey = parsed && typeof parsed === "object" && (Array.isArray(parsed.wishes) || Array.isArray(parsed.心愿));
      if (parsed && !hasWishKey) {
        steps.push(`⚠️ 工作流返回的 JSON 里没有 wishes 数组 (现有 key: ${Object.keys(parsed).join(", ") || "空"})。→ 去扣子把 profile 工作流的提示词加一段: 让它在档案 JSON 里额外输出 wishes 数组。`);
      }
      parsedWishes = parseWishes(parsed);
      steps.push(parsedWishes.length > 0
        ? `✅ 从档案输出里解析出 ${parsedWishes.length} 个心愿`
        : "⚠️ 没解析到心愿 (这句话不含心愿 / 工作流提示词还没加 wishes 输出)");
    } catch (e: any) {
      steps.push(`❌ 调扣子工作流报错: ${e?.message || e}`);
    }
  }
  return { workflowId, templateFound, rawOutput, parsedWishes, steps };
}
