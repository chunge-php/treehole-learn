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

  // 分类名称 → id 映射 (top_types 二级)
  const { data: levels = [] } = await sb.from("top_types").select("id, name, parent_id").not("parent_id", "is", null);
  const categoryMap = new Map<string, string>();
  (levels || []).forEach((t: any) => categoryMap.set(String(t.name).trim(), t.id));

  let success = 0;
  const errors: { row: number; message: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const typeRaw = String(r["类型"] || r["type"] || "").trim();
    const type = TYPE_FROM_CN[typeRaw] || (typeRaw as ResourceType);
    if (!["text", "video", "file"].includes(type)) {
      errors.push({ row: i + 2, message: `类型无效：${typeRaw || "空"}` });
      continue;
    }

    let title = String(r["标题"] || r["title"] || "").trim();
    const media_url = String(r["媒体地址"] || r["media_url"] || "").trim() || null;
    // 文件类型: 标题为空时用文件名兜底
    if (!title && type === "file" && media_url) {
      const fname = media_url.split("/").pop() || "未命名文件";
      title = fname.replace(/\.[^.]+$/, "");
    }
    if (!title) {
      errors.push({ row: i + 2, message: "标题为空" });
      continue;
    }

    // 必填字段校验
    if (type === "text" && !String(r["正文"] || r["body"] || "").trim()) {
      errors.push({ row: i + 2, message: "文本类型必填正文" });
      continue;
    }
    if (type !== "text" && !media_url) {
      errors.push({ row: i + 2, message: `${typeRaw}类型必填媒体地址` });
      continue;
    }

    // 分类名称解析 (仅文本/视频)
    let category_id: string | null = null;
    if (type !== "file") {
      const catName = String(r["分类名称"] || r["category_name"] || "").trim();
      if (catName) {
        category_id = categoryMap.get(catName) || null;
        if (!category_id) {
          errors.push({ row: i + 2, message: `分类「${catName}」不存在 (请先在'设置→顶级类型'中创建)` });
          continue;
        }
      }
    }

    // 状态解析
    const statusRaw = String(r["状态"] || r["status"] || "").trim();
    const status: "online" | "offline" = (statusRaw === "下架" || statusRaw === "offline") ? "offline" : "online";

    const durRaw = r["时长秒"] ?? r["duration_sec"];
    const sizeRaw = r["文件大小"] ?? r["file_size"];
    const sortRaw = r["排序"] ?? r["sort_order"];

    const { error } = await sb.from("resources").insert({
      id: shortId("rs"),
      type,
      title,
      cover_url: type !== "file" ? (r["封面"] || r["cover_url"] || null) : null,
      body: type === "text" ? (r["正文"] || r["body"] || null) : null,
      media_url,
      duration_sec: type === "video" && durRaw != null && durRaw !== "" ? Number(durRaw) : null,
      file_size: type === "file" && sizeRaw != null && sizeRaw !== "" ? Number(sizeRaw) : null,
      file_ext: type === "file" ? (r["扩展名"] || r["file_ext"] || null) : null,
      category_id,
      status,
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
  // 一次拿全部 (一级+二级), 客户端 join, 给二级附加父级名做 hint
  const { data } = await sb.from("top_types")
    .select("id, name, parent_id, sort_order")
    .eq("status", "active")
    .order("sort_order", { ascending: true });
  const rows = data || [];
  const parentNameMap = new Map(
    rows.filter((c: any) => !c.parent_id).map((c: any) => [c.id, c.name as string])
  );
  // 按父分组排序: 同一父级下的二级聚在一起
  return rows
    .filter((c: any) => c.parent_id)
    .map((c: any) => ({
      id: c.id as string,
      name: c.name as string,
      parent_id: c.parent_id as string,
      parent_name: parentNameMap.get(c.parent_id) || null
    }))
    .sort((a, b) => (a.parent_name || "").localeCompare(b.parent_name || ""));
}

