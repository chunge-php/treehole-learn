"use server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { renderPrompt } from "@/lib/profile/sync";
import { cozeConfigured } from "@/lib/coze/client";

export type ChatStudent = {
  id: string; name: string; phone: string; grade: string;
  store?: string; channel?: string;
};

export type ChatTemplate = {
  id: string; code: string; name: string;
  system_role: string; prefix_template: string; rules: string;
};

export type ChatBootstrap = {
  students: ChatStudent[];
  templates: ChatTemplate[];
  workflowId: string | null;
  cozeConfigured: boolean;
  baseUrl: string;
};

export async function bootstrapChat(): Promise<ChatBootstrap> {
  requireAdmin();
  const sb = adminSupabase();
  const [{ data: students }, { data: templates }] = await Promise.all([
    sb.from("end_users")
      .select("id, name, phone, grade, stores(name), channels(name)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(500),
    sb.from("prompt_templates")
      .select("id, code, name, system_role, prefix_template, rules")
      .eq("is_active", true)
      // 聊天页只让选主对话提示词; 抽取类/信件类模板会让 AI 输出 JSON 或写信, 一律过滤掉
      .neq("code", "profile_extract")
      .neq("code", "wish_extract")
      .neq("code", "monthly_wish_letter")
      .order("updated_at", { ascending: false })
  ]);
  return {
    students: (students || []).map((u: any) => ({
      id: u.id, name: u.name, phone: u.phone || "", grade: u.grade || "",
      store: u.stores?.name, channel: u.channels?.name
    })),
    templates: (templates || []) as ChatTemplate[],
    workflowId: process.env.COZE_WORKFLOW_AI_TUTOR || null,
    cozeConfigured: cozeConfigured(),
    baseUrl: process.env.COZE_BASE_URL || "https://api.coze.cn"
  };
}

/** 渲染最终 system_prompt (供前端预览) */
export async function buildSystemPrompt(input: { end_user_id: string; template_id: string }) {
  requireAdmin();
  const sb = adminSupabase();
  const [{ data: tpl }, { data: eu }, { data: prof }] = await Promise.all([
    sb.from("prompt_templates").select("system_role, prefix_template, rules").eq("id", input.template_id).maybeSingle(),
    sb.from("end_users").select("id, name, grade").eq("id", input.end_user_id).maybeSingle(),
    sb.from("user_profiles").select("*").eq("end_user_id", input.end_user_id).maybeSingle()
  ]);
  if (!tpl) throw new Error("模板不存在");
  if (!eu) throw new Error("学生不存在");
  const prefix_rendered = renderPrompt((tpl as any).prefix_template, prof, eu);
  const full = [
    (tpl as any).system_role || "",
    prefix_rendered,
    (tpl as any).rules || ""
  ].filter(Boolean).join("\n\n");
  return {
    system_role: (tpl as any).system_role,
    prefix_rendered,
    rules: (tpl as any).rules,
    full,
    student_name: (eu as any).name as string
  };
}
