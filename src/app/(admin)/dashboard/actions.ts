"use server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";
import { scopedChannelFilter } from "@/lib/scope";

export type ChannelSummaryRow = {
  id: string;
  name: string;
  region: string;
  stores: number;
  devices: number;
  users: number;
  records: number;
  revenue: number;
};

export async function getChannelSummary(params: { q?: string; page?: number; pageSize?: number }) {
  const s = requireSession();
  const sb = adminSupabase();
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const scope = scopedChannelFilter(s);

  let qb = sb.from("channels").select("id, name, province, city", { count: "exact" });
  if (scope && scope !== "__none__") qb = qb.eq("id", scope);
  if (params.q) qb = qb.ilike("name", `%${params.q}%`);
  qb = qb.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);

  const { data: channels = [], count = 0, error } = await qb;
  if (error) throw new Error(error.message);

  const ids = (channels || []).map((c: any) => c.id);
  const safeIds = ids.length ? ids : ["__none__"];
  const [storeRows, userRows, assessRows, paidRows] = await Promise.all([
    sb.from("stores").select("channel_id, device_count").in("channel_id", safeIds),
    sb.from("end_users").select("channel_id").in("channel_id", safeIds),
    sb.from("assessment_records").select("channel_id").in("channel_id", safeIds),
    sb.from("orders").select("channel_id, amount").eq("pay_status", "paid").in("channel_id", safeIds)
  ]);

  const agg: Record<string, { stores: number; devices: number; users: number; records: number; revenue: number }> = {};
  const bump = (id: string, k: "stores" | "devices" | "users" | "records" | "revenue", v = 1) => {
    if (!agg[id]) agg[id] = { stores: 0, devices: 0, users: 0, records: 0, revenue: 0 };
    agg[id][k] += v;
  };
  (storeRows.data || []).forEach((r: any) => { bump(r.channel_id, "stores"); bump(r.channel_id, "devices", Number(r.device_count || 0)); });
  (userRows.data || []).forEach((r: any) => bump(r.channel_id, "users"));
  (assessRows.data || []).forEach((r: any) => bump(r.channel_id, "records"));
  (paidRows.data || []).forEach((r: any) => bump(r.channel_id, "revenue", Number(r.amount || 0)));

  const rows: ChannelSummaryRow[] = (channels || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    region: [c.province, c.city].filter(Boolean).join(" · "),
    stores: agg[c.id]?.stores || 0,
    devices: agg[c.id]?.devices || 0,
    users: agg[c.id]?.users || 0,
    records: agg[c.id]?.records || 0,
    revenue: agg[c.id]?.revenue || 0
  }));
  return { rows, total: count || 0 };
}
