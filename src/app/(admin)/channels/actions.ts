"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { shortId } from "@/lib/utils";

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
};

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
  } else {
    const id = shortId("ch");
    const { error } = await sb.from("channels").insert({
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
    if (error) throw new Error(error.message);
  }
  revalidatePath("/channels");
  return { ok: true };
}

export async function deleteChannel(id: string) {
  requireAdmin();
  const sb = adminSupabase();
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
  let success = 0;
  const errors: { row: number; message: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = String(r["渠道名称"] || r["name"] || "").trim();
    if (!name) {
      errors.push({ row: i + 2, message: "渠道名称为空" });
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
    else success++;
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
