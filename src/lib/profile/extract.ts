/**
 * 档案抽取 — 复用扣子 profile_extract 工作流, 把任意一段 AI 输出
 * (聊天 / 月度家长信 / 测评解读) 喂给抽取工作流, 拿到结构化 JSON, 合并到
 * user_profiles 各分片. 走 mergeProfileUpdate (内部已串行队列防数据竞争).
 */
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { runWorkflow } from "@/lib/coze/client";
import { mergeProfileUpdate } from "@/lib/profile/sync";

export type ProfileExtractResult = { changed: string[]; note: string };

/** 跑一次档案抽取并合并到 user_profiles, 返回改动字段 + 友好状态原因 (测试中心展示用) */
export async function runProfileExtractDetailed(args: {
  endUserId: string;
  userMessage: string;
  assistantMessage: string;
  by?: string | null;
}): Promise<ProfileExtractResult> {
  const workflowId = process.env.COZE_WORKFLOW_PROFILE_EXTRACT || "";
  if (!workflowId) return { changed: [], note: "未配置 COZE_WORKFLOW_PROFILE_EXTRACT" };

  const sb = adminSupabase();
  const { data: tpl } = await sb.from("prompt_templates")
    .select("system_role").eq("code", "profile_extract").eq("is_active", true).maybeSingle();
  if (!tpl?.system_role) return { changed: [], note: "缺 profile_extract 提示词模板" };

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
    let raw: any = res.data;
    if (raw && typeof raw === "object" && "output" in raw) raw = (raw as any).output;
    if (typeof raw === "string") {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      try { parsed = JSON.parse(cleaned); } catch {}
    } else if (raw && typeof raw === "object") {
      parsed = raw;
    }
  } catch (e: any) {
    console.error("[profile-extract] workflow call failed:", e?.message || e);
    return { changed: [], note: `扣子调用报错: ${e?.message || e}` };
  }
  if (!parsed) return { changed: [], note: "扣子返回无法解析为 JSON" };

  try {
    const changed = await mergeProfileUpdate({
      end_user_id: args.endUserId,
      update: parsed,
      by: args.by ?? null
    });
    return { changed, note: changed.length > 0 ? `更新 ${changed.length} 项` : "本轮无新增档案信息" };
  } catch (e: any) {
    console.error("[profile-extract] merge failed:", e?.message || e);
    return { changed: [], note: `合并写库失败: ${e?.message || e}` };
  }
}

/** 兼容旧调用: 只要改动字段列表 */
export async function runProfileExtract(args: {
  endUserId: string;
  userMessage: string;
  assistantMessage: string;
  by?: string | null;
}): Promise<string[]> {
  return (await runProfileExtractDetailed(args)).changed;
}
