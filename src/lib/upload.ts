"use server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";
import { customAlphabet } from "nanoid";

const BUCKET = "th-media";
const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
const nano = customAlphabet(alphabet, 16);

function kindOf(mime: string): "image" | "video" | "audio" | "file" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

/**
 * 上传文件到 Supabase Storage 公共桶 th-media, 并登记到 assets 表
 * 限制 50MB; 大文件考虑客户端直传 (后续)
 */
export async function uploadFile(formData: FormData): Promise<{ ok: boolean; url?: string; name?: string; type?: string; error?: string }> {
  try {
    const s = requireSession();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) return { ok: false, error: "未选择文件" };
    if (file.size === 0) return { ok: false, error: "文件为空" };
    if (file.size > 50 * 1024 * 1024) return { ok: false, error: "文件超过 50MB" };

    const ext = (file.name.split(".").pop() || "bin").toLowerCase().slice(0, 12);
    const prefix = formData.get("prefix") || "f";
    const path = `${prefix}/${new Date().getFullYear()}/${nano()}.${ext}`;

    const sb = adminSupabase();
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await sb.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });
    if (error) return { ok: false, error: error.message };

    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    const url = data.publicUrl;
    const mime = file.type || "application/octet-stream";

    // 登记到 assets 表 (失败不阻塞上传)
    await sb.from("assets").insert({
      id: `as_${nano()}`,
      url,
      bucket: BUCKET,
      path,
      name: file.name,
      mime_type: mime,
      size: file.size,
      kind: kindOf(mime),
      uploaded_by: s.account_id
    });

    return { ok: true, url, name: file.name, type: mime };
  } catch (e: any) {
    return { ok: false, error: e?.message || "上传失败" };
  }
}

/** 浏览/搜索素材库 */
export async function listAssets(params: {
  kind?: "image" | "video" | "audio" | "file";
  q?: string;
  limit?: number;
} = {}): Promise<Array<{ id: string; url: string; name: string | null; mime_type: string | null; size: number | null; kind: string; created_at: string }>> {
  requireSession();
  const sb = adminSupabase();
  let qb = sb.from("assets").select("id, url, name, mime_type, size, kind, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(params.limit ?? 60, 200));
  if (params.kind) qb = qb.eq("kind", params.kind);
  if (params.q) qb = qb.ilike("name", `%${params.q}%`);
  const { data = [] } = await qb;
  return data || [];
}
