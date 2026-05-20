"use server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";
import { scopedChannelFilter } from "@/lib/scope";

export async function listOrders(params: {
  q?: string;
  pay_status?: string;
  channel_id?: string | null;
  store_id?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const s = requireSession();
  const sb = adminSupabase();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  let qb = sb
    .from("orders")
    .select("*, channels(name), stores(name), end_users(name, phone)", { count: "exact" });

  const scope = scopedChannelFilter(s);
  if (scope === "__none__") return { rows: [], total: 0 };
  if (scope) qb = qb.eq("channel_id", scope);
  else if (params.channel_id) qb = qb.eq("channel_id", params.channel_id);

  if (params.store_id) qb = qb.eq("store_id", params.store_id);
  if (params.q) qb = qb.ilike("order_no", `%${params.q}%`);
  if (params.pay_status) qb = qb.eq("pay_status", params.pay_status);

  qb = qb.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  const { data, count, error } = await qb;
  if (error) throw new Error(error.message);
  return { rows: data || [], total: count || 0 };
}

export async function getOrderDetail(id: string) {
  requireSession();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("orders")
    .select("*, channels(name), stores(name), end_users(name, phone)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}
