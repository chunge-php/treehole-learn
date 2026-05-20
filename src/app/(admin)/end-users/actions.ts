"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";
import { scopedChannelFilter } from "@/lib/scope";
import { shortId } from "@/lib/utils";

export type EndUserInput = {
  id?: string;
  store_id: string;
  name: string;
  phone?: string | null;
  gender?: "male" | "female" | "other" | null;
  age?: number | null;
  grade?: string | null;
  school?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  paid_amount?: number | null;
  status?: "active" | "disabled";
  remark?: string | null;
};

export async function listEndUsers(params: { q?: string; store_id?: string | null; channel_id?: string | null; page?: number; pageSize?: number }) {
  const s = requireSession();
  const sb = adminSupabase();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  let qb = sb.from("end_users").select("*, stores(name), channels(name)", { count: "exact" });

  const scope = scopedChannelFilter(s);
  if (scope === "__none__") return { rows: [], total: 0 };
  if (scope) qb = qb.eq("channel_id", scope);
  else if (params.channel_id) qb = qb.eq("channel_id", params.channel_id);

  if (params.store_id) qb = qb.eq("store_id", params.store_id);
  if (params.q) qb = qb.or(`name.ilike.%${params.q}%,phone.ilike.%${params.q}%`);
  qb = qb.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await qb;
  if (error) throw new Error(error.message);
  return { rows: data || [], total: count || 0 };
}

export async function upsertEndUser(input: EndUserInput) {
  const s = requireSession();
  const sb = adminSupabase();

  if (!input.store_id) throw new Error("请选择所属店铺");

  // 反查 store → channel_id；同时校验 channel_admin 权限
  const { data: store, error: stErr } = await sb.from("stores").select("id, channel_id").eq("id", input.store_id).maybeSingle();
  if (stErr) throw new Error(stErr.message);
  if (!store) throw new Error("所属店铺不存在");
  if (s.role === "channel_admin" && store.channel_id !== s.channel_id) {
    throw new Error("无权操作其它渠道下的店铺");
  }

  const payload = {
    store_id: store.id,
    channel_id: store.channel_id,
    name: input.name,
    phone: input.phone,
    gender: input.gender,
    age: input.age ?? null,
    grade: input.grade,
    school: input.school,
    parent_name: input.parent_name,
    parent_phone: input.parent_phone,
    paid_amount: input.paid_amount ?? 0,
    status: input.status || "active",
    remark: input.remark
  };

  if (input.id) {
    let qb = sb.from("end_users").update(payload).eq("id", input.id);
    if (s.role === "channel_admin") qb = qb.eq("channel_id", s.channel_id || "__none__");
    const { error } = await qb;
    if (error) throw new Error(error.message);
  } else {
    const id = shortId("eu");
    const { error } = await sb.from("end_users").insert({ id, ...payload });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/end-users");
  return { ok: true };
}

export async function deleteEndUser(id: string) {
  const s = requireSession();
  const sb = adminSupabase();
  let qb = sb.from("end_users").delete().eq("id", id);
  if (s.role === "channel_admin") qb = qb.eq("channel_id", s.channel_id || "__none__");
  const { error } = await qb;
  if (error) throw new Error(error.message);
  revalidatePath("/end-users");
  return { ok: true };
}

export async function bulkImportEndUsers(rows: Record<string, any>[]) {
  const s = requireSession();
  const sb = adminSupabase();

  const scope = scopedChannelFilter(s);
  let storeQb = sb.from("stores").select("id, name, channel_id");
  if (scope && scope !== "__none__") storeQb = storeQb.eq("channel_id", scope);
  const { data: stores = [] } = await storeQb;
  const storeMap = new Map<string, { id: string; channel_id: string }>();
  (stores || []).forEach((st: any) => storeMap.set(String(st.name).trim(), { id: st.id, channel_id: st.channel_id }));

  let success = 0;
  const errors: { row: number; message: string }[] = [];

  const genderMap: Record<string, "male" | "female" | "other"> = {
    "男": "male", "male": "male", "M": "male", "m": "male",
    "女": "female", "female": "female", "F": "female", "f": "female",
    "其他": "other", "other": "other"
  };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = String(r["姓名"] || r["name"] || "").trim();
    if (!name) {
      errors.push({ row: i + 2, message: "姓名为空" });
      continue;
    }
    const storeName = String(r["所属店铺名称"] || r["store_name"] || "").trim();
    if (!storeName) {
      errors.push({ row: i + 2, message: "所属店铺名称为空" });
      continue;
    }
    const store = storeMap.get(storeName);
    if (!store) {
      errors.push({ row: i + 2, message: `店铺「${storeName}」不存在或无权操作` });
      continue;
    }

    const rawGender = String(r["性别"] || r["gender"] || "").trim();
    const gender = rawGender ? (genderMap[rawGender] || null) : null;

    const { error } = await sb.from("end_users").insert({
      id: shortId("eu"),
      store_id: store.id,
      channel_id: store.channel_id,
      name,
      phone: r["电话"] || r["phone"] || null,
      gender,
      age: r["年龄"] ? Number(r["年龄"]) || null : (r["age"] ? Number(r["age"]) || null : null),
      grade: r["年级"] || r["grade"] || null,
      school: r["学校"] || r["school"] || null,
      parent_name: r["家长姓名"] || r["parent_name"] || null,
      parent_phone: r["家长电话"] || r["parent_phone"] || null,
      paid_amount: r["付费金额"] ? Number(r["付费金额"]) || 0 : (r["paid_amount"] ? Number(r["paid_amount"]) || 0 : 0),
      remark: r["备注"] || r["remark"] || null
    });
    if (error) errors.push({ row: i + 2, message: error.message });
    else success++;
  }
  revalidatePath("/end-users");
  return { total: rows.length, success, failed: rows.length - success, errors };
}

/**
 * 表单/筛选用：返回当前可见的店铺列表
 */
export async function listStoresForSelect() {
  const s = requireSession();
  const sb = adminSupabase();
  const scope = scopedChannelFilter(s);
  if (scope === "__none__") return [];
  let qb = sb.from("stores")
    .select("id, name, channel_id, channels(name)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(500);
  if (scope) qb = qb.eq("channel_id", scope);
  const { data = [] } = await qb;
  return data || [];
}
