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

/** 实时校验渠道级别名称是否可用 */
export async function checkChannelLevelNameAvailable(
  name: string,
  excludeId?: string
): Promise<{ ok: boolean; reason?: string }> {
  requireAdmin();
  const n = (name || "").trim();
  if (!n) return { ok: false, reason: "名称不能为空" };
  const sb = adminSupabase();
  let qb = sb.from("channel_levels").select("id").eq("name", n).limit(1);
  if (excludeId) qb = qb.neq("id", excludeId);
  const { data } = await qb.maybeSingle();
  if (data) return { ok: false, reason: "已存在同名级别" };
  return { ok: true };
}

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
  const n = (input.name || "").trim();
  if (!n) throw new Error("请填写名称");

  // 唯一性预检 (排除自己)
  let dupQ = sb.from("channel_levels").select("id").eq("name", n).limit(1);
  if (input.id) dupQ = dupQ.neq("id", input.id);
  const { data: dup } = await dupQ.maybeSingle();
  if (dup) throw new Error(`渠道级别「${n}」已存在`);

  if (input.id) {
    const { error } = await sb.from("channel_levels").update({
      name: n,
      rank: input.rank ?? 0,
      remark: input.remark
    }).eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const id = shortId("lv");
    const { error } = await sb.from("channel_levels").insert({
      id,
      name: n,
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
