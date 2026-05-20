"use server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";
import { customAlphabet } from "nanoid";

const BUCKET = "th-media";
const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
const nano = customAlphabet(alphabet, 16);

/**
 * 上传文件到 Supabase Storage 公共桶 th-media
 * 限制 50MB; 大文件考虑客户端直传 (后续)
 */
export async function uploadFile(formData: FormData): Promise<{ ok: boolean; url?: string; name?: string; type?: string; error?: string }> {
  try {
    requireSession();
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
    return { ok: true, url: data.publicUrl, name: file.name, type: file.type };
  } catch (e: any) {
    return { ok: false, error: e?.message || "上传失败" };
  }
}
