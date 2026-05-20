"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";
import { scopedChannelFilter } from "@/lib/scope";
import { shortId } from "@/lib/utils";

export type AssignmentInput = {
  id?: string;
  end_user_id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
};

/** 验证当前账号是否能操作指定学员 (channel_admin 只能动自己渠道下的) */
async function ensureUserAccess(end_user_id: string) {
  const s = requireSession();
  const sb = adminSupabase();
  const { data: u } = await sb.from("end_users").select("id, channel_id, store_id").eq("id", end_user_id).maybeSingle();
  if (!u) throw new Error("学员不存在");
  if (s.role === "channel_admin" && u.channel_id !== s.channel_id) {
    throw new Error("无权操作其它渠道的学员");
  }
  return { session: s, user: u, sb };
}

export async function listAssignments(params: {
  end_user_id: string;
  q?: string;
  date_from?: string;
  date_to?: string;
  status?: "all" | "pending" | "done";
}) {
  const s = requireSession();
  const sb = adminSupabase();

  // 渠道隔离: 通过 end_user 反查权限
  const { data: u } = await sb.from("end_users").select("id, channel_id").eq("id", params.end_user_id).maybeSingle();
  if (!u) return [];
  if (s.role === "channel_admin" && u.channel_id !== s.channel_id) return [];

  let qb = sb.from("assignments").select("*").eq("end_user_id", params.end_user_id);
  if (params.q) qb = qb.ilike("name", `%${params.q}%`);
  if (params.date_from) qb = qb.gte("end_date", params.date_from); // 任务覆盖范围与查询区间有交集
  if (params.date_to) qb = qb.lte("start_date", params.date_to);
  if (params.status === "pending") qb = qb.is("completed_at", null);
  if (params.status === "done") qb = qb.not("completed_at", "is", null);
  qb = qb.order("start_date", { ascending: false }).limit(200);
  const { data = [], error } = await qb;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAssignment(input: AssignmentInput) {
  const { session: s, user, sb } = await ensureUserAccess(input.end_user_id);
  if (!input.name.trim()) throw new Error("请填写任务名称");
  if (!input.start_date || !input.end_date) throw new Error("请选择起止日期");
  if (input.start_date > input.end_date) throw new Error("结束日期不能早于开始日期");

  const { error } = await sb.from("assignments").insert({
    id: shortId("at"),
    end_user_id: input.end_user_id,
    channel_id: user.channel_id,
    store_id: user.store_id,
    name: input.name.trim(),
    start_date: input.start_date,
    end_date: input.end_date
  });
  if (error) throw new Error(error.message);
  revalidatePath("/end-users");
  void s;
  return { ok: true };
}

export async function toggleAssignmentDone(id: string, done: boolean) {
  const s = requireSession();
  const sb = adminSupabase();
  const { data: a } = await sb.from("assignments").select("id, end_user_id, channel_id").eq("id", id).maybeSingle();
  if (!a) throw new Error("任务不存在");
  if (s.role === "channel_admin" && a.channel_id !== s.channel_id) {
    throw new Error("无权操作");
  }
  const { error } = await sb.from("assignments")
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/end-users");
  return { ok: true };
}

export async function deleteAssignment(id: string) {
  const s = requireSession();
  const sb = adminSupabase();
  const { data: a } = await sb.from("assignments").select("id, channel_id").eq("id", id).maybeSingle();
  if (!a) throw new Error("任务不存在");
  if (s.role === "channel_admin" && a.channel_id !== s.channel_id) {
    throw new Error("无权操作");
  }
  const { error } = await sb.from("assignments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/end-users");
  return { ok: true };
}
