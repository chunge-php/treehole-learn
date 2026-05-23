/**
 * 家长 ↔ 普通用户(学生) 绑定。
 * 规则: 一个家长可绑多个学生; 每个学生独占(只能被一个家长绑定, 换绑需原主先解绑)。
 * 绑定依据 = 学生的「关联手机号」(end_users.phone)。
 */
import { adminSupabase } from "@/lib/supabase/admin";
import { shortId } from "@/lib/utils";

/** 登录自动绑定: 把「关联手机号 = phone」且尚未被绑定的学生, 绑给该家长 */
export async function autoBindByPhone(parentId: string, phone?: string | null): Promise<number> {
  if (!phone) return 0;
  const sb = adminSupabase();
  const { data: students } = await sb.from("end_users").select("id").eq("phone", phone);
  if (!students || students.length === 0) return 0;

  const ids = students.map((s: any) => s.id);
  const { data: bound } = await sb.from("parent_bindings").select("end_user_id").in("end_user_id", ids);
  const boundSet = new Set((bound || []).map((b: any) => b.end_user_id));

  const toBind = ids.filter((id) => !boundSet.has(id));
  if (toBind.length === 0) return 0;

  const rows = toBind.map((end_user_id) => ({ id: shortId("pb"), parent_id: parentId, end_user_id }));
  const { error } = await sb.from("parent_bindings").insert(rows);
  if (error) return 0;
  return toBind.length;
}

export type BindResult =
  | { ok: true; count: number; message: string }
  | { ok: false; error: string };

/** 手动绑定: 输手机号; 已被他人绑定则拒绝 */
export async function bindByPhone(parentId: string, phone: string): Promise<BindResult> {
  const p = (phone || "").trim();
  if (!/^1\d{10}$/.test(p)) return { ok: false, error: "请输入正确的手机号" };

  const sb = adminSupabase();
  const { data: students } = await sb.from("end_users").select("id, name").eq("phone", p);
  if (!students || students.length === 0) {
    return { ok: false, error: "未找到该手机号对应的学员，请确认后台已录入" };
  }

  const ids = students.map((s: any) => s.id);
  const { data: bound } = await sb.from("parent_bindings").select("end_user_id, parent_id").in("end_user_id", ids);
  const byOther = (bound || []).filter((b: any) => b.parent_id !== parentId);
  if (byOther.length > 0) {
    return { ok: false, error: "该手机号已被其他家长绑定，需原绑定人解绑后才能绑定" };
  }
  const boundSelf = new Set((bound || []).map((b: any) => b.end_user_id));
  const toBind = ids.filter((id) => !boundSelf.has(id));
  if (toBind.length === 0) {
    return { ok: true, count: 0, message: "你已绑定该学员" };
  }

  const rows = toBind.map((end_user_id) => ({ id: shortId("pb"), parent_id: parentId, end_user_id }));
  const { error } = await sb.from("parent_bindings").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, count: toBind.length, message: "绑定成功" };
}

/** 解绑 (仅能解绑自己名下的学生) */
export async function unbind(parentId: string, endUserId: string): Promise<{ ok: boolean; error?: string }> {
  if (!endUserId) return { ok: false, error: "缺少学员" };
  const sb = adminSupabase();
  const { error } = await sb
    .from("parent_bindings")
    .delete()
    .eq("parent_id", parentId)
    .eq("end_user_id", endUserId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** 列出该家长名下已绑定的学生 */
export async function listBoundStudents(parentId: string) {
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("parent_bindings")
    .select("end_user_id, created_at, end_users(name, phone, grade, gender)")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((b: any) => ({
    endUserId: b.end_user_id,
    name: b.end_users?.name || "",
    phone: b.end_users?.phone || "",
    grade: b.end_users?.grade || "",
    gender: b.end_users?.gender || "",
    boundAt: b.created_at
  }));
}
