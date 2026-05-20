"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { shortId } from "@/lib/utils";

export type ResourceType = "text" | "video" | "file";

export type ResourceInput = {
  id?: string;
  type: ResourceType;
  title: string;
  cover_url?: string | null;
  body?: string | null;
  media_url?: string | null;
  duration_sec?: number | null;
  file_size?: number | null;
  file_ext?: string | null;
  category_id?: string | null;
  status?: "online" | "offline";
  sort_order?: number | null;
  remark?: string | null;
};

const TYPE_FROM_CN: Record<string, ResourceType> = {
  文本: "text",
  视频: "video",
  文件: "file"
};

export async function listResources(params: {
  q?: string;
  type?: string;
  category_id?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  requireAdmin();
  const sb = adminSupabase();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  let qb = sb.from("resources").select("*, top_types(name)", { count: "exact" });
  if (params.q) qb = qb.ilike("title", `%${params.q}%`);
  if (params.type) qb = qb.eq("type", params.type);
  if (params.category_id) qb = qb.eq("category_id", params.category_id);
  if (params.status) qb = qb.eq("status", params.status);
  qb = qb.order("sort_order", { ascending: true }).order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  const { data, count, error } = await qb;
  if (error) throw new Error(error.message);
  return { rows: data || [], total: count || 0 };
}

export async function upsertResource(input: ResourceInput) {
  requireAdmin();
  const sb = adminSupabase();
  const payload = {
    type: input.type,
    title: input.title,
    cover_url: input.cover_url || null,
    body: input.type === "text" ? (input.body || null) : null,
    media_url: input.type !== "text" ? (input.media_url || null) : null,
    duration_sec: input.type === "video" ? (input.duration_sec ?? null) : null,
    file_size: input.type === "file" ? (input.file_size ?? null) : null,
    file_ext: input.type === "file" ? (input.file_ext || null) : null,
    category_id: input.category_id || null,
    status: input.status || "online",
    sort_order: input.sort_order ?? 0,
    remark: input.remark || null
  };
  if (input.id) {
    const { error } = await sb.from("resources").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const id = shortId("rs");
    const { error } = await sb.from("resources").insert({ id, ...payload });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/resources");
  return { ok: true };
}

export async function deleteResource(id: string) {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb.from("resources").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/resources");
  return { ok: true };
}

export async function toggleResourceStatus(id: string, status: "online" | "offline") {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb.from("resources").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/resources");
  return { ok: true };
}

export async function bulkImportResources(rows: Record<string, any>[]) {
  requireAdmin();
  const sb = adminSupabase();
  let success = 0;
  const errors: { row: number; message: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const title = String(r["标题"] || r["title"] || "").trim();
    if (!title) {
      errors.push({ row: i + 2, message: "标题为空" });
      continue;
    }
    const typeRaw = String(r["类型"] || r["type"] || "").trim();
    const type = TYPE_FROM_CN[typeRaw] || (typeRaw as ResourceType);
    if (!["text", "video", "file"].includes(type)) {
      errors.push({ row: i + 2, message: `类型无效：${typeRaw}` });
      continue;
    }
    const durRaw = r["时长秒"] ?? r["duration_sec"];
    const sizeRaw = r["文件大小"] ?? r["file_size"];
    const sortRaw = r["排序"] ?? r["sort_order"];

    const { error } = await sb.from("resources").insert({
      id: shortId("rs"),
      type,
      title,
      cover_url: r["封面"] || r["cover_url"] || null,
      body: type === "text" ? (r["正文"] || r["body"] || null) : null,
      media_url: type !== "text" ? (r["媒体地址"] || r["media_url"] || null) : null,
      duration_sec: type === "video" && durRaw != null && durRaw !== "" ? Number(durRaw) : null,
      file_size: type === "file" && sizeRaw != null && sizeRaw !== "" ? Number(sizeRaw) : null,
      file_ext: type === "file" ? (r["扩展名"] || r["file_ext"] || null) : null,
      category_id: r["分类ID"] || r["category_id"] || null,
      status: "online",
      sort_order: sortRaw != null && sortRaw !== "" ? Number(sortRaw) : 0,
      remark: r["备注"] || r["remark"] || null
    });
    if (error) errors.push({ row: i + 2, message: error.message });
    else success++;
  }
  revalidatePath("/resources");
  return { total: rows.length, success, failed: rows.length - success, errors };
}

export async function listCategories() {
  requireAdmin();
  const sb = adminSupabase();
  const { data } = await sb.from("top_types")
    .select("id, name, parent_id")
    .not("parent_id", "is", null)
    .order("sort_order", { ascending: true });
  return data || [];
}

