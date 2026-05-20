"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";
import { scopedChannelFilter, scopedWriteChannelId } from "@/lib/scope";
import { shortId } from "@/lib/utils";

export type StoreInput = {
  id?: string;
  channel_id?: string | null;
  name: string;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  device_count?: number | null;
  status?: "active" | "disabled";
  remark?: string | null;
};

/** 实时校验店铺名在指定渠道下是否可用 */
export async function checkStoreNameAvailable(
  name: string,
  channelId: string | null,
  excludeId?: string
): Promise<{ ok: boolean; reason?: string }> {
  const s = requireSession();
  const n = (name || "").trim();
  if (!n) return { ok: false, reason: "店铺名称不能为空" };
  if (n.length < 2) return { ok: false, reason: "至少 2 个字符" };

  // channel_admin 强制使用自己的 channel_id
  const effChannel = s.role === "channel_admin" ? s.channel_id : channelId;

  const sb = adminSupabase();
  let qb = sb.from("stores").select("id").eq("name", n);
  if (effChannel) qb = qb.eq("channel_id", effChannel);
  else qb = qb.is("channel_id", null);
  if (excludeId) qb = qb.neq("id", excludeId);
  const { data } = await qb.limit(1).maybeSingle();
  if (data) {
    const ctx = effChannel ? "本渠道下" : "未关联渠道组内";
    return { ok: false, reason: `${ctx}已存在同名店铺` };
  }
  return { ok: true };
}

export async function listStores(params: { q?: string; status?: string; channel_id?: string | null; page?: number; pageSize?: number }) {
  const s = requireSession();
  const sb = adminSupabase();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  let qb = sb.from("stores").select("*, channels(name)", { count: "exact" });

  const scope = scopedChannelFilter(s);
  if (scope === "__none__") return { rows: [], total: 0 };
  if (scope) qb = qb.eq("channel_id", scope);
  else if (params.channel_id) qb = qb.eq("channel_id", params.channel_id);

  if (params.q) qb = qb.ilike("name", `%${params.q}%`);
  if (params.status) qb = qb.eq("status", params.status);
  qb = qb.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await qb;
  if (error) throw new Error(error.message);
  const rows = data || [];

  // 附加聚合: 用户数 / 测评人次 / 销售金额
  const ids = rows.map((r: any) => r.id);
  if (ids.length > 0) {
    const [usersAgg, recordsAgg, ordersAgg] = await Promise.all([
      sb.from("end_users").select("store_id").in("store_id", ids),
      sb.from("assessment_records").select("store_id").in("store_id", ids),
      sb.from("orders").select("store_id, amount").eq("pay_status", "paid").in("store_id", ids)
    ]);
    const uCount: Record<string, number> = {};
    const rCount: Record<string, number> = {};
    const oRevenue: Record<string, number> = {};
    (usersAgg.data || []).forEach((r: any) => { uCount[r.store_id] = (uCount[r.store_id] || 0) + 1; });
    (recordsAgg.data || []).forEach((r: any) => { rCount[r.store_id] = (rCount[r.store_id] || 0) + 1; });
    (ordersAgg.data || []).forEach((r: any) => { oRevenue[r.store_id] = (oRevenue[r.store_id] || 0) + Number(r.amount || 0); });
    rows.forEach((r: any) => {
      r._user_count = uCount[r.id] || 0;
      r._record_count = rCount[r.id] || 0;
      r._revenue = oRevenue[r.id] || 0;
    });
  }
  return { rows, total: count || 0 };
}

export async function upsertStore(input: StoreInput) {
  const s = requireSession();
  const sb = adminSupabase();

  // channel_admin 强制锁死自己渠道；admin 优先用 acting，否则用表单传入(允许为 null)
  const channel_id = s.role === "channel_admin"
    ? s.channel_id
    : (scopedWriteChannelId(s) || input.channel_id || null);

  // channel_admin 必须有自己的 channel_id; admin 可以创建无关联店铺
  if (s.role === "channel_admin" && !channel_id) {
    throw new Error("无法识别您的渠道归属");
  }

  // 唯一性预检: 同一渠道下店铺名不能重复 (null 渠道也算同一组)
  if (input.name?.trim()) {
    let dupQ = sb.from("stores").select("id").eq("name", input.name.trim());
    if (channel_id) dupQ = dupQ.eq("channel_id", channel_id);
    else dupQ = dupQ.is("channel_id", null);
    if (input.id) dupQ = dupQ.neq("id", input.id);
    const { data: dup } = await dupQ.limit(1).maybeSingle();
    if (dup) {
      const ctx = channel_id ? "本渠道下" : "未关联渠道";
      throw new Error(`${ctx}已存在同名店铺「${input.name.trim()}」`);
    }
  }

  const payload = {
    channel_id,
    name: input.name,
    province: input.province,
    city: input.city,
    district: input.district,
    address: input.address,
    contact_name: input.contact_name,
    contact_phone: input.contact_phone,
    device_count: input.device_count ?? 0,
    status: input.status || "active",
    remark: input.remark
  };

  if (input.id) {
    let qb = sb.from("stores").update(payload).eq("id", input.id);
    // channel_admin 只能改自己渠道下的店铺
    if (s.role === "channel_admin") qb = qb.eq("channel_id", s.channel_id || "__none__");
    const { error } = await qb;
    if (error) throw new Error(error.message);
  } else {
    const id = shortId("st");
    const { error } = await sb.from("stores").insert({ id, ...payload });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/stores");
  return { ok: true };
}

export async function deleteStore(id: string) {
  const s = requireSession();
  const sb = adminSupabase();
  let qb = sb.from("stores").delete().eq("id", id);
  if (s.role === "channel_admin") qb = qb.eq("channel_id", s.channel_id || "__none__");
  const { error } = await qb;
  if (error) throw new Error(error.message);
  revalidatePath("/stores");
  return { ok: true };
}

export async function toggleStoreStatus(id: string, status: "active" | "disabled") {
  const s = requireSession();
  const sb = adminSupabase();
  let qb = sb.from("stores").update({ status }).eq("id", id);
  if (s.role === "channel_admin") qb = qb.eq("channel_id", s.channel_id || "__none__");
  const { error } = await qb;
  if (error) throw new Error(error.message);
  revalidatePath("/stores");
  return { ok: true };
}

export async function bulkImportStores(rows: Record<string, any>[]) {
  const s = requireSession();
  const sb = adminSupabase();

  // 取渠道名称 → id 映射，channel_admin 锁死自己渠道
  const lockedChannelId = s.role === "channel_admin" ? s.channel_id : scopedWriteChannelId(s);
  const { data: chs = [] } = await sb.from("channels").select("id, name");
  const channelMap = new Map<string, string>();
  (chs || []).forEach((c: any) => channelMap.set(String(c.name).trim(), c.id));

  // 现有 (name + channel_id) 集合预检 (channel_id 为 null 时统一用"__none__")
  const { data: existingStores = [] } = await sb.from("stores").select("name, channel_id");
  const dupKey = (n: string, c: string | null) => `${n}::${c || "__none__"}`;
  const existsSet = new Set((existingStores || []).map((st: any) => dupKey(String(st.name).trim(), st.channel_id)));
  const seenInBatch = new Set<string>();

  let success = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = String(r["店铺名称"] || r["name"] || "").trim();
    if (!name) {
      errors.push({ row: i + 2, message: "店铺名称为空" });
      continue;
    }

    let channel_id: string | null = lockedChannelId || null;
    if (!channel_id) {
      const chName = String(r["所属渠道名称"] || r["channel_name"] || "").trim();
      // admin 模式下允许留空 (创建无关联渠道的店铺)
      if (chName) {
        channel_id = channelMap.get(chName) || null;
        if (!channel_id) {
          errors.push({ row: i + 2, message: `渠道「${chName}」不存在` });
          continue;
        }
      }
    }

    const k = dupKey(name, channel_id);
    if (existsSet.has(k)) {
      const ctx = channel_id ? "该渠道下" : "未关联渠道";
      errors.push({ row: i + 2, message: `${ctx}已存在同名店铺「${name}」` });
      continue;
    }
    if (seenInBatch.has(k)) {
      errors.push({ row: i + 2, message: `本次导入中重复出现店铺「${name}」` });
      continue;
    }

    const { error } = await sb.from("stores").insert({
      id: shortId("st"),
      channel_id,
      name,
      province: r["省"] || r["province"] || null,
      city: r["市"] || r["city"] || null,
      district: r["区"] || r["district"] || null,
      address: r["地址"] || r["address"] || null,
      contact_name: r["联系人"] || r["contact_name"] || null,
      contact_phone: r["电话"] || r["contact_phone"] || null,
      device_count: Number(r["设备数"] || r["device_count"] || 0) || 0,
      remark: r["备注"] || r["remark"] || null
    });
    if (error) errors.push({ row: i + 2, message: error.message });
    else { success++; seenInBatch.add(k); }
  }
  revalidatePath("/stores");
  return { total: rows.length, success, failed: rows.length - success, errors };
}

/**
 * 表单/筛选用：返回当前可见的渠道列表
 * - channel_admin: 只返回自己渠道
 * - admin 有 acting: 只返回该渠道
 * - admin 全局: 返回全部
 */
export async function listChannelsForSelect() {
  const s = requireSession();
  const sb = adminSupabase();
  const scope = scopedChannelFilter(s);
  if (scope === "__none__") return [];
  let qb = sb.from("channels").select("id, name").order("created_at", { ascending: false });
  if (scope) qb = qb.eq("id", scope);
  const { data = [] } = await qb;
  return data || [];
}
