"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { shortId } from "@/lib/utils";
import bcrypt from "bcryptjs";

export type AccountInput = {
  id?: string;
  username: string;
  password?: string; // 新建必填,编辑可选(填了即修改密码)
  display_name: string;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  role: "super_admin" | "admin" | "channel_admin";
  channel_id?: string | null;
  status?: "active" | "disabled";
  remark?: string | null;
};

export async function listAccounts(params: { q?: string; role?: string; status?: string; channel_id?: string | null; page?: number; pageSize?: number }) {
  requireAdmin();
  const sb = adminSupabase();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  let qb = sb.from("accounts").select("*, channels(name)", { count: "exact" });
  if (params.q) qb = qb.or(`username.ilike.%${params.q}%,display_name.ilike.%${params.q}%`);
  if (params.role) qb = qb.eq("role", params.role);
  if (params.status) qb = qb.eq("status", params.status);
  if (params.channel_id) qb = qb.eq("channel_id", params.channel_id);
  qb = qb.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  const { data, count, error } = await qb;
  if (error) throw new Error(error.message);
  // 不向外返回 password_hash
  const rows = (data || []).map((r: any) => {
    const { password_hash, ...rest } = r;
    return rest;
  });
  return { rows, total: count || 0 };
}

export async function listChannelsForAccount() {
  requireAdmin();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("channels")
    .select("id, name")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAccount(input: AccountInput) {
  requireAdmin();
  if (!input.username.trim()) throw new Error("请填写用户名");
  if (!input.password) throw new Error("请填写密码");
  if (input.password.length < 6) throw new Error("密码至少 6 位");
  if (input.role === "channel_admin" && !input.channel_id) {
    throw new Error("渠道管理员必须选择归属渠道");
  }
  const sb = adminSupabase();
  const { data: existed } = await sb.from("accounts").select("id").eq("username", input.username).maybeSingle();
  if (existed) throw new Error("用户名已存在");

  const id = shortId("acc");
  const password_hash = await bcrypt.hash(input.password, 10);
  const { error } = await sb.from("accounts").insert({
    id,
    username: input.username.trim(),
    password_hash,
    display_name: input.display_name.trim(),
    phone: input.phone,
    email: input.email,
    avatar_url: input.avatar_url,
    role: input.role,
    channel_id: input.role === "channel_admin" ? input.channel_id : null,
    status: input.status || "active",
    remark: input.remark
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings/accounts");
  return { ok: true };
}

export async function updateAccount(input: AccountInput) {
  requireAdmin();
  if (!input.id) throw new Error("缺少 ID");
  if (input.role === "channel_admin" && !input.channel_id) {
    throw new Error("渠道管理员必须选择归属渠道");
  }
  const sb = adminSupabase();
  const payload: any = {
    display_name: input.display_name.trim(),
    phone: input.phone,
    email: input.email,
    avatar_url: input.avatar_url,
    role: input.role,
    channel_id: input.role === "channel_admin" ? input.channel_id : null,
    status: input.status || "active",
    remark: input.remark
  };
  if (input.password) {
    if (input.password.length < 6) throw new Error("密码至少 6 位");
    payload.password_hash = await bcrypt.hash(input.password, 10);
  }
  const { error } = await sb.from("accounts").update(payload).eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/accounts");
  return { ok: true };
}

export async function resetPassword(id: string, newPassword: string) {
  requireAdmin();
  if (!newPassword || newPassword.length < 6) throw new Error("密码至少 6 位");
  const sb = adminSupabase();
  const password_hash = await bcrypt.hash(newPassword, 10);
  const { error } = await sb.from("accounts").update({ password_hash }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/accounts");
  return { ok: true };
}

export async function toggleAccountStatus(id: string, status: "active" | "disabled") {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb.from("accounts").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/accounts");
  return { ok: true };
}

export async function deleteAccount(id: string) {
  const s = requireAdmin();
  if (s.account_id === id) throw new Error("不能删除当前登录账号");
  const sb = adminSupabase();
  const { error } = await sb.from("accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/accounts");
  return { ok: true };
}
