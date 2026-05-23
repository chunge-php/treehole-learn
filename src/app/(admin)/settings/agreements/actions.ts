"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export type AgreementRow = {
  id: string;
  type: "user" | "privacy";
  title: string;
  content: string;
  version: string;
  updated_at: string;
};

export async function listAgreements(): Promise<AgreementRow[]> {
  requireAdmin();
  const sb = adminSupabase();
  const { data, error } = await sb.from("agreements").select("*").order("type");
  if (error) throw new Error(error.message);
  return (data || []) as AgreementRow[];
}

export async function saveAgreement(input: {
  type: "user" | "privacy";
  title: string;
  content: string;
  version?: string;
}) {
  requireAdmin();
  const sb = adminSupabase();
  const title = (input.title || "").trim();
  const content = (input.content || "").trim();
  if (!title) throw new Error("请填写标题");
  if (!content) throw new Error("请填写协议正文");

  const { error } = await sb
    .from("agreements")
    .upsert(
      {
        id: input.type === "user" ? "agr_user" : "agr_privacy",
        type: input.type,
        title,
        content,
        version: (input.version || "1.0").trim(),
        updated_at: new Date().toISOString()
      },
      { onConflict: "type" }
    );
  if (error) throw new Error(error.message);
  revalidatePath("/settings/agreements");
  return { ok: true };
}
