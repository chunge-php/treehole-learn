"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { shortId } from "@/lib/utils";

export type TopTypeInput = {
  id?: string;
  parent_id?: string | null;
  name: string;
  cover_url?: string | null;
  selected_icon_url?: string | null;
  unselected_icon_url?: string | null;
  sort_order?: number | null;
  status?: "active" | "disabled";
};

export type TopTypeNode = {
  id: string;
  parent_id: string | null;
  name: string;
  cover_url: string | null;
  selected_icon_url: string | null;
  unselected_icon_url: string | null;
  sort_order: number | null;
  status: "active" | "disabled";
  created_at: string;
  children: TopTypeNode[];
};

export async function listTopTypesTree(): Promise<TopTypeNode[]> {
  requireAdmin();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("top_types")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data || []) as any[];

  const map = new Map<string, TopTypeNode>();
  rows.forEach(r => map.set(r.id, { ...r, children: [] }));
  const roots: TopTypeNode[] = [];
  rows.forEach(r => {
    const node = map.get(r.id)!;
    if (r.parent_id && map.has(r.parent_id)) {
      map.get(r.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export async function listTopLevelOptions() {
  requireAdmin();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("top_types")
    .select("id, name")
    .is("parent_id", null)
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertTopType(input: TopTypeInput) {
  requireAdmin();
  const sb = adminSupabase();
  const payload: any = {
    parent_id: input.parent_id || null,
    name: input.name,
    sort_order: input.sort_order ?? 0,
    status: input.status || "active"
  };
  if (input.parent_id) {
    payload.cover_url = null;
    payload.selected_icon_url = input.selected_icon_url || null;
    payload.unselected_icon_url = input.unselected_icon_url || null;
  } else {
    payload.cover_url = input.cover_url || null;
    payload.selected_icon_url = null;
    payload.unselected_icon_url = null;
  }
  if (input.id) {
    const { error } = await sb.from("top_types").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const id = shortId("tt");
    const { error } = await sb.from("top_types").insert({ id, ...payload });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/settings/top-types");
  return { ok: true };
}

export async function deleteTopType(id: string) {
  requireAdmin();
  const sb = adminSupabase();
  // 先检查是否有子级
  const { data: kids } = await sb.from("top_types").select("id").eq("parent_id", id).limit(1);
  if (kids && kids.length > 0) {
    throw new Error("该类型下还有子类型，请先删除子类型");
  }
  const { error } = await sb.from("top_types").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/top-types");
  return { ok: true };
}
