import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getMpAuth } from "@/lib/mp-session";
import { customAlphabet } from "nanoid";

export const dynamic = "force-dynamic";

const BUCKET = "th-media";
const nano = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);

/**
 * 头像上传 (小程序 wx.uploadFile, 字段名 file)
 * 传到公共桶 th-media, 写回 mp_parents.avatar_url, 返回公开 URL
 */
export async function POST(req: Request) {
  try {
    const auth = getMpAuth(req);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, error: "未选择图片" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "图片超过 5MB" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "png").toLowerCase().slice(0, 8);
    const path = `avatar/${auth.parent_id}_${nano()}.${ext}`;
    const sb = adminSupabase();
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await sb.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: file.type || "image/png", upsert: true });
    if (error) throw new Error(error.message);

    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    const url = data.publicUrl;
    await sb.from("mp_parents").update({ avatar_url: url }).eq("id", auth.parent_id);

    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "上传失败" }, { status: 500 });
  }
}
