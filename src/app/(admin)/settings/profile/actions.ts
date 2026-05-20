"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export type ProfileInput = {
  display_name: string;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

export async function getMyProfile() {
  const s = requireSession();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("accounts")
    .select("id, username, display_name, phone, email, avatar_url, role, channel_id, channels(name), last_login_at, created_at")
    .eq("id", s.account_id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProfile(input: ProfileInput) {
  const s = requireSession();
  if (!input.display_name?.trim()) throw new Error("请填写显示名称");
  const sb = adminSupabase();
  const { error } = await sb.from("accounts").update({
    display_name: input.display_name.trim(),
    phone: input.phone,
    email: input.email,
    avatar_url: input.avatar_url
  }).eq("id", s.account_id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/profile");
  return { ok: true };
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const s = requireSession();
  if (!oldPassword) throw new Error("请输入旧密码");
  if (!newPassword || newPassword.length < 6) throw new Error("新密码至少 6 位");
  if (oldPassword === newPassword) throw new Error("新密码不能与旧密码相同");

  const sb = adminSupabase();
  const { data, error } = await sb
    .from("accounts")
    .select("password_hash")
    .eq("id", s.account_id)
    .single();
  if (error) throw new Error(error.message);
  if (!data?.password_hash) throw new Error("账号异常");

  const ok = await bcrypt.compare(oldPassword, data.password_hash);
  if (!ok) throw new Error("旧密码不正确");

  const password_hash = await bcrypt.hash(newPassword, 10);
  const { error: e2 } = await sb.from("accounts").update({ password_hash }).eq("id", s.account_id);
  if (e2) throw new Error(e2.message);
  return { ok: true };
}
