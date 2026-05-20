"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { shortId } from "@/lib/utils";
import bcrypt from "bcryptjs";

export type ChannelInput = {
  id?: string;
  name: string;
  level_id?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  status?: "active" | "disabled";
  remark?: string | null;
  // 仅新建时使用: 同步创建渠道管理员账号
  admin_account?: {
    username: string;
    password: string;
    display_name: string;
  } | null;
};

/** 实时校验渠道名是否可用 */
export async function checkChannelNameAvailable(name: string, excludeId?: string): Promise<{ ok: boolean; reason?: string }> {
  requireAdmin();
  const n = (name || "").trim();
  if (!n) return { ok: false, reason: "渠道名称不能为空" };
  if (n.length < 2) return { ok: false, reason: "至少 2 个字符" };
  const sb = adminSupabase();
  let qb = sb.from("channels").select("id").eq("name", n).limit(1);
  if (excludeId) qb = qb.neq("id", excludeId);
  const { data } = await qb.maybeSingle();
  if (data) return { ok: false, reason: "已存在同名渠道" };
  return { ok: true };
}

export async function listChannels(params: { q?: string; status?: string; page?: number; pageSize?: number }) {
  requireAdmin();
  const sb = adminSupabase();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  let qb = sb.from("channels").select("*, channel_levels(name)", { count: "exact" });
  if (params.q) qb = qb.ilike("name", `%${params.q}%`);
  if (params.status) qb = qb.eq("status", params.status);
  qb = qb.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  const { data, count, error } = await qb;
  if (error) throw new Error(error.message);
  const rows = data || [];

  // 附加店铺数 / 用户数
  const ids = rows.map(r => r.id);
  if (ids.length > 0) {
    const [storesAgg, usersAgg] = await Promise.all([
      sb.from("stores").select("channel_id").in("channel_id", ids),
      sb.from("end_users").select("channel_id").in("channel_id", ids)
    ]);
    const stCount: Record<string, number> = {};
    (storesAgg.data || []).forEach((r: any) => { stCount[r.channel_id] = (stCount[r.channel_id] || 0) + 1; });
    const uCount: Record<string, number> = {};
    (usersAgg.data || []).forEach((r: any) => { uCount[r.channel_id] = (uCount[r.channel_id] || 0) + 1; });
    rows.forEach((r: any) => {
      r._store_count = stCount[r.id] || 0;
      r._user_count = uCount[r.id] || 0;
    });
  }
  return { rows, total: count || 0 };
}

export async function upsertChannel(input: ChannelInput) {
  requireAdmin();
  const sb = adminSupabase();

  // 名称唯一性预检 (排除自己)
  if (input.name?.trim()) {
    let dupQ = sb.from("channels").select("id").eq("name", input.name.trim()).limit(1);
    if (input.id) dupQ = dupQ.neq("id", input.id);
    const { data: dup } = await dupQ.maybeSingle();
    if (dup) throw new Error(`渠道名称「${input.name.trim()}」已存在`);
  }

  if (input.id) {
    const { error } = await sb.from("channels").update({
      name: input.name,
      level_id: input.level_id,
      province: input.province,
      city: input.city,
      district: input.district,
      address: input.address,
      contact_name: input.contact_name,
      contact_phone: input.contact_phone,
      status: input.status || "active",
      remark: input.remark
    }).eq("id", input.id);
    if (error) throw new Error(error.message);
    revalidatePath("/channels");
    return { ok: true, id: input.id };
  }

  // 新建
  const id = shortId("ch");

  // 如果带账号, 先校验账号合法性, 再原子地创建两条记录
  if (input.admin_account) {
    const a = input.admin_account;
    if (!a.username.trim()) throw new Error("请填写管理员账号");
    if (!a.password || a.password.length < 6) throw new Error("管理员密码至少 6 位");
    if (!a.display_name.trim()) throw new Error("请填写管理员显示名");
    if (!/^[一-龥a-zA-Z0-9_.-]+$/.test(a.username.trim())) {
      throw new Error("管理员账号仅支持中文、字母、数字与 _ . -");
    }
    const { data: existed } = await sb.from("accounts").select("id").eq("username", a.username.trim()).maybeSingle();
    if (existed) throw new Error("管理员账号已存在");
  }

  const { error: chErr } = await sb.from("channels").insert({
    id,
    name: input.name,
    level_id: input.level_id,
    province: input.province,
    city: input.city,
    district: input.district,
    address: input.address,
    contact_name: input.contact_name,
    contact_phone: input.contact_phone,
    status: input.status || "active",
    remark: input.remark
  });
  if (chErr) throw new Error(chErr.message);

  if (input.admin_account) {
    const a = input.admin_account;
    const password_hash = await bcrypt.hash(a.password, 10);
    const { error: accErr } = await sb.from("accounts").insert({
      id: shortId("acc"),
      username: a.username.trim(),
      password_hash,
      display_name: a.display_name.trim(),
      role: "channel_admin",
      channel_id: id,
      status: "active"
    });
    if (accErr) {
      // 账号创建失败 → 回滚渠道
      await sb.from("channels").delete().eq("id", id);
      throw new Error("创建管理员账号失败: " + accErr.message);
    }
  }
  revalidatePath("/channels");
  return { ok: true, id };
}

/** 渠道关联的管理员账号列表(用于编辑面板展示) */
export async function getChannelAdmins(channel_id: string) {
  requireAdmin();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("accounts")
    .select("id, username, display_name, status, last_login_at")
    .eq("channel_id", channel_id)
    .eq("role", "channel_admin")
    .order("created_at");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function deleteChannel(id: string) {
  requireAdmin();
  const sb = adminSupabase();
  // 先删关联的渠道管理员账号 (其他 role 即使 channel_id 一致也保留 — 仅清理 channel_admin)
  await sb.from("accounts").delete().eq("channel_id", id).eq("role", "channel_admin");
  // 删渠道 — FK SET NULL 会自动把 stores/end_users/assessment_records 的 channel_id 置空
  const { error } = await sb.from("channels").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/channels");
  return { ok: true };
}

export async function toggleChannelStatus(id: string, status: "active" | "disabled") {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb.from("channels").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/channels");
  return { ok: true };
}

export async function bulkImportChannels(rows: Record<string, any>[]) {
  requireAdmin();
  const sb = adminSupabase();
  // 拉一份现有渠道名集合做预检
  const { data: existing = [] } = await sb.from("channels").select("name");
  const existsSet = new Set((existing || []).map((c: any) => c.name));
  const seenInBatch = new Set<string>();

  let success = 0;
  const errors: { row: number; message: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = String(r["渠道名称"] || r["name"] || "").trim();
    if (!name) {
      errors.push({ row: i + 2, message: "渠道名称为空" });
      continue;
    }
    if (existsSet.has(name)) {
      errors.push({ row: i + 2, message: `渠道名称「${name}」已存在` });
      continue;
    }
    if (seenInBatch.has(name)) {
      errors.push({ row: i + 2, message: `本次导入中重复出现「${name}」` });
      continue;
    }
    const { error } = await sb.from("channels").insert({
      id: shortId("ch"),
      name,
      province: r["省"] || r["province"] || null,
      city: r["市"] || r["city"] || null,
      district: r["区"] || r["district"] || null,
      address: r["地址"] || r["address"] || null,
      contact_name: r["联系人"] || r["contact_name"] || null,
      contact_phone: r["联系电话"] || r["contact_phone"] || null,
      remark: r["备注"] || r["remark"] || null
    });
    if (error) errors.push({ row: i + 2, message: error.message });
    else { success++; seenInBatch.add(name); }
  }
  revalidatePath("/channels");
  return { total: rows.length, success, failed: rows.length - success, errors };
}

export async function listChannelLevels() {
  requireAdmin();
  const sb = adminSupabase();
  const { data = [] } = await sb.from("channel_levels").select("*").order("rank");
  return data || [];
}
