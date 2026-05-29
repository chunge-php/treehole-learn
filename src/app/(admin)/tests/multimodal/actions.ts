"use server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import {
  generateRandomScores, evaluate, toExternalJson,
  type MultimodalScores
} from "@/lib/multimodal/scoring";
import { updateProfileFromMultimodal, renderPrompt } from "@/lib/profile/sync";

export type StudentOpt = {
  id: string; name: string; phone: string; grade: string;
  store?: string; channel?: string;
};

export async function listStudentsForTest(): Promise<StudentOpt[]> {
  requireAdmin();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("end_users")
    .select("id, name, phone, grade, stores(name), channels(name)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data || []).map((u: any) => ({
    id: u.id, name: u.name, phone: u.phone || "", grade: u.grade || "",
    store: u.stores?.name, channel: u.channels?.name
  }));
}

export async function listActivePromptTemplates() {
  requireAdmin();
  const sb = adminSupabase();
  const { data } = await sb
    .from("prompt_templates")
    .select("id, code, name, system_role, prefix_template, rules")
    .eq("is_active", true)
    .eq("kind", "chat")   // 白名单: 只列主对话模板, 抽取/信件类不出现 (防被新模板顶成默认选中)
    .order("updated_at", { ascending: false });
  return (data || []) as Array<{ id: string; code: string; name: string; system_role: string; prefix_template: string; rules: string }>;
}

/** 跑一次模拟测评: 随机生成 → 算分 → 输出 (不落库) */
export async function simulateMultimodal(bias: "uniform" | "high" | "low" | "normal", endUserId?: string) {
  requireAdmin();
  const scores = generateRandomScores(bias);
  const result = evaluate(scores);
  const externalJson = toExternalJson(result, {
    user_id: endUserId || "XXL0000000",
    video_id: `${stampForId()}${endUserId || "XXL0000000"}raw.mp4`,
    audio_id: `${stampForId()}${endUserId || "XXL0000000"}raw.wav`,
    txt_id:   `${stampForId()}${endUserId || "XXL0000000"}raw.txt`
  });
  return { result, externalJson };
}

/** 落库: 把模拟结果作为该学生最近一次多模态档案 */
export async function saveMultimodalToProfile(input: {
  end_user_id: string;
  scores: MultimodalScores;
}) {
  const s = requireAdmin();
  const result = evaluate(input.scores);
  const externalJson = toExternalJson(result, {
    user_id: input.end_user_id,
    video_id: `${stampForId()}${input.end_user_id}raw.mp4`,
    audio_id: `${stampForId()}${input.end_user_id}raw.wav`,
    txt_id:   `${stampForId()}${input.end_user_id}raw.txt`
  });
  await updateProfileFromMultimodal({
    end_user_id: input.end_user_id,
    result, externalJson,
    by: s.account_id
  });
  return { ok: true, result, externalJson };
}

/** 用某个学生 + 模板 渲染最终 prompt 预览 */
export async function previewPrompt(input: { end_user_id: string; template_id: string }) {
  requireAdmin();
  const sb = adminSupabase();
  const [{ data: tpl }, { data: eu }, { data: prof }] = await Promise.all([
    sb.from("prompt_templates").select("system_role, prefix_template, rules").eq("id", input.template_id).maybeSingle(),
    sb.from("end_users").select("id, name, grade").eq("id", input.end_user_id).maybeSingle(),
    sb.from("user_profiles").select("*").eq("end_user_id", input.end_user_id).maybeSingle()
  ]);
  if (!tpl) throw new Error("模板不存在");
  if (!eu) throw new Error("学生不存在");
  const rendered = renderPrompt((tpl as any).prefix_template, prof, eu);
  return {
    system_role: (tpl as any).system_role,
    prefix_rendered: rendered,
    rules: (tpl as any).rules
  };
}

function stampForId(): string {
  const d = new Date();
  const yyyy = d.getFullYear(), mm = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}
