"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { shortId } from "@/lib/utils";

export type PromptTemplateKind = "chat" | "extract" | "letter";

export type PromptTemplateRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  kind: PromptTemplateKind;
  system_role: string;
  prefix_template: string;
  rules: string;
  is_active: boolean;
  version: number;
  updated_at: string;
};

export async function listPromptTemplates(): Promise<PromptTemplateRow[]> {
  requireAdmin();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("prompt_templates")
    .select("id, code, name, description, kind, system_role, prefix_template, rules, is_active, version, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as PromptTemplateRow[];
}

export async function getPromptTemplate(id: string): Promise<PromptTemplateRow | null> {
  requireAdmin();
  const sb = adminSupabase();
  const { data } = await sb
    .from("prompt_templates")
    .select("id, code, name, description, kind, system_role, prefix_template, rules, is_active, version, updated_at")
    .eq("id", id)
    .maybeSingle();
  return (data as PromptTemplateRow) || null;
}

export async function upsertPromptTemplate(input: Partial<PromptTemplateRow> & { id?: string }) {
  const s = requireAdmin();
  const sb = adminSupabase();
  const id = input.id || shortId("pt");
  const code = (input.code || "").trim();
  const name = (input.name || "").trim();
  if (!code) throw new Error("请填写 code");
  if (!name) throw new Error("请填写名称");

  const payload: any = {
    id, code, name,
    description: input.description ?? null,
    kind: (["chat", "extract", "letter"] as const).includes(input.kind as any) ? input.kind : "chat",
    system_role: input.system_role || "",
    prefix_template: input.prefix_template || "",
    rules: input.rules || "",
    is_active: input.is_active !== false,
    updated_by: s.account_id,
    updated_at: new Date().toISOString()
  };

  if (input.id) {
    // update + bump version
    const { data: cur } = await sb.from("prompt_templates").select("version").eq("id", id).maybeSingle();
    payload.version = ((cur as any)?.version || 1) + 1;
    const { error } = await sb.from("prompt_templates").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    payload.version = 1;
    const { error } = await sb.from("prompt_templates").insert(payload);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/tests/prompt-templates");
  return { id };
}

export async function deletePromptTemplate(id: string) {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb.from("prompt_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tests/prompt-templates");
}
