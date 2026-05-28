/**
 * POST /api/app/ai/upload-image — 学生拍照/选本地图上传 (拿 public URL)
 *
 *  header:  Authorization: Bearer <token>
 *  body:    multipart/form-data, field 名 file
 *  resp:    { ok, url, name, type, size }
 *
 * 拿到 url 后, 调 /api/app/ai/chat 时把 image_url 传过来即可。
 * 后端会在调扣子时, 自动 fetch 这个 URL → 上传扣子拿 file_id → 喂视觉模型。
 */
import { NextResponse } from "next/server";
import { requireAppAuth } from "@/lib/app-session";
import { adminSupabase } from "@/lib/supabase/admin";
import { customAlphabet } from "nanoid";

export const dynamic = "force-dynamic";
const BUCKET = "th-media";
const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
const nano = customAlphabet(alphabet, 16);

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  let form: FormData;
  try { form = await req.formData(); }
  catch {
    return NextResponse.json({ ok: false, error: "请用 multipart/form-data", code: "INVALID_FORM" }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "未选择文件", code: "MISSING_FILE" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "请选择图片文件", code: "INVALID_TYPE" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: "文件为空", code: "EMPTY_FILE" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ ok: false, error: "图片不能超过 10MB", code: "FILE_TOO_LARGE" }, { status: 413 });
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase().slice(0, 6);
  const path = `chat/${auth.payload.student_id}/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}/${nano()}.${ext}`;

  const sb = adminSupabase();
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type || "image/png",
    upsert: false
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message, code: "UPLOAD_FAILED" }, { status: 500 });
  }
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);

  // 登记到 assets 表 (失败不阻塞)
  await sb.from("assets").insert({
    id: `as_${nano()}`,
    url: data.publicUrl,
    bucket: BUCKET,
    path,
    name: file.name,
    mime_type: file.type,
    size: file.size,
    kind: "image",
    uploaded_by: null   // App 端不绑 admin id, 后期可加 uploaded_by_student
  }).then(undefined, () => {});

  return NextResponse.json({
    ok: true,
    url: data.publicUrl,
    name: file.name,
    type: file.type,
    size: file.size
  });
}
