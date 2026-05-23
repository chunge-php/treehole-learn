"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export type MpParentRow = {
  id: string;
  nickname: string | null;
  avatar: string | null;
  phone: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  bindings: { endUserId: string; name: string }[];
};

export async function listMpParents(): Promise<MpParentRow[]> {
  requireAdmin();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("mp_parents")
    .select("id, nickname, avatar_url, phone, status, last_login_at, created_at, parent_bindings(end_user_id, end_users(name))")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data || []).map((p: any) => ({
    id: p.id,
    nickname: p.nickname,
    avatar: p.avatar_url,
    phone: p.phone,
    status: p.status,
    lastLoginAt: p.last_login_at,
    createdAt: p.created_at,
    bindings: (p.parent_bindings || []).map((b: any) => ({
      endUserId: b.end_user_id,
      name: b.end_users?.name || "未知学员"
    }))
  }));
}

/** 管理员强制解绑某家长名下的某学员 (解绑后该学员可被重新绑定) */
export async function adminUnbind(parentId: string, endUserId: string) {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb
    .from("parent_bindings")
    .delete()
    .eq("parent_id", parentId)
    .eq("end_user_id", endUserId);
  if (error) throw new Error(error.message);
  revalidatePath("/wechat-users");
  return { ok: true };
}
