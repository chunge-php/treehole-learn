/**
 * POST /api/app/face-check/upload-media — 多模态文件上传到华为云 OBS
 *
 *  header: Authorization: Bearer <token>
 *  body:   multipart/form-data
 *    - file: binary
 *    - kind: "audio" | "video" | "script" (audio=wav, video=mp4, script=txt)
 *  resp:   { ok, url, file_id, kind, timestamp, bytes }
 *
 * 严格按《学习力项目多模态交互的技术需求文档》3.1 路径规范:
 *   data/{XXL+7位}/{audio|video|script}/{timestamp}/{timestamp}{user_id}raw.{ext}
 *
 * 上传完后, 调 POST /api/app/face-check/finalize 时把 url 传过去触发评分
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { uploadMultimodalToObs, obsConfigured } from "@/lib/report/huawei-obs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCEPT: Record<string, { mimePrefix: string; defaultExt: string; maxSize: number }> = {
  audio:  { mimePrefix: "audio/",  defaultExt: "wav", maxSize: 50 * 1024 * 1024 },  // 50 MB
  video:  { mimePrefix: "video/",  defaultExt: "mp4", maxSize: 500 * 1024 * 1024 }, // 500 MB
  script: { mimePrefix: "text/",   defaultExt: "txt", maxSize: 5 * 1024 * 1024 }    // 5 MB
};

export async function POST(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  if (!obsConfigured()) {
    return NextResponse.json({ ok: false, error: "华为 OBS 未配置, 联系管理员", code: "OBS_NOT_CONFIGURED" }, { status: 500 });
  }

  let form: FormData;
  try { form = await req.formData(); }
  catch {
    return NextResponse.json({ ok: false, error: "请用 multipart/form-data", code: "INVALID_FORM" }, { status: 400 });
  }
  const kind = String(form.get("kind") || "").trim();
  if (!ACCEPT[kind]) {
    return NextResponse.json({ ok: false, error: "kind 必须是 audio / video / script", code: "INVALID_KIND" }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "未选择文件", code: "MISSING_FILE" }, { status: 400 });
  }
  const accept = ACCEPT[kind];
  if (!file.type.startsWith(accept.mimePrefix)) {
    return NextResponse.json({ ok: false, error: `kind=${kind} 期望 ${accept.mimePrefix}* 文件类型, 实际 ${file.type}`, code: "INVALID_TYPE" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: "文件为空", code: "EMPTY_FILE" }, { status: 400 });
  }
  if (file.size > accept.maxSize) {
    return NextResponse.json({ ok: false, error: `文件超过 ${accept.maxSize / 1024 / 1024} MB`, code: "FILE_TOO_LARGE" }, { status: 413 });
  }

  // 取学生 seq_no 生成 XXL 编号
  const sb = adminSupabase();
  const { data: student } = await sb.from("end_users").select("seq_no").eq("id", auth.payload.student_id).maybeSingle();
  if (!student) {
    return NextResponse.json({ ok: false, error: "学生不存在", code: "NOT_FOUND" }, { status: 404 });
  }
  const xxlUserId = `XXL${String((student as any).seq_no || 0).padStart(7, "0")}`;

  const ext = (file.name.split(".").pop() || accept.defaultExt).toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const result = await uploadMultimodalToObs(buf, {
      user_id: xxlUserId,
      kind: kind as "audio" | "video" | "script",
      contentType: file.type,
      ext
    });
    return NextResponse.json({
      ok: true,
      url: result.url,
      file_id: result.file_id,
      path: result.path,
      timestamp: result.timestamp,
      kind,
      bytes: file.size,
      xxl_user_id: xxlUserId
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "上传失败", code: "UPLOAD_FAILED" }, { status: 500 });
  }
}
