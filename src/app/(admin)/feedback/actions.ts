"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export type FeedbackRow = {
  id: string;
  content: string;
  contact: string | null;
  status: "pending" | "resolved";
  reply: string | null;
  created_at: string;
  parentNickname: string | null;
  parentAvatar: string | null;
  parentPhone: string | null;
};

export async function listFeedback(): Promise<FeedbackRow[]> {
  requireAdmin();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("mp_feedback")
    .select("id, content, contact, status, reply, created_at, mp_parents(nickname, avatar_url, phone)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data || []).map((f: any) => ({
    id: f.id,
    content: f.content,
    contact: f.contact,
    status: f.status,
    reply: f.reply,
    created_at: f.created_at,
    parentNickname: f.mp_parents?.nickname || null,
    parentAvatar: f.mp_parents?.avatar_url || null,
    parentPhone: f.mp_parents?.phone || null
  }));
}

export async function deleteFeedback(id: string) {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb.from("mp_feedback").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/feedback");
  return { ok: true };
}

export async function setFeedbackStatus(id: string, status: "pending" | "resolved") {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb.from("mp_feedback").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/feedback");
  return { ok: true };
}
