"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { shortId } from "@/lib/utils";

export type ChannelLevelInput = {
  id?: string;
  name: string;
  rank?: number | null;
  remark?: string | null;
};

export async function listChannelLevels() {
  requireAdmin();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("channel_levels")
    .select("*")
    .order("rank", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertChannelLevel(input: ChannelLevelInput) {
  requireAdmin();
  const sb = adminSupabase();
  if (input.id) {
    const { error } = await sb.from("channel_levels").update({
      name: input.name,
      rank: input.rank ?? 0,
      remark: input.remark
    }).eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const id = shortId("lv");
    const { error } = await sb.from("channel_levels").insert({
      id,
      name: input.name,
      rank: input.rank ?? 0,
      remark: input.remark
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/settings/channel-levels");
  return { ok: true };
}

export async function deleteChannelLevel(id: string) {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb.from("channel_levels").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/channel-levels");
  return { ok: true };
}
