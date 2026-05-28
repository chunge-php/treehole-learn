/**
 * GET  /api/app/assignments?date=YYYY-MM-DD — 当日任务列表 (按学科分组)
 * POST /api/app/assignments                 — 学生智能添加作业 (设计图 9)
 *
 *   header:  Authorization: Bearer <token>
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { shortId } from "@/lib/utils";

export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateOnly(s: string): string | null {
  // 接受 YYYY-MM-DD 或 YYYY-MM-DD HH:mm[:ss], 取前 10 字符
  if (typeof s !== "string") return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export async function GET(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || todayStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "date 格式必须 YYYY-MM-DD", code: "INVALID_DATE" }, { status: 400 });
  }

  const sb = adminSupabase();
  const { data, error } = await sb.from("assignments")
    .select("id, name, subject, task_type, source, estimated_minutes, actual_minutes, cover_url, completed_at, created_at, meta")
    .eq("end_user_id", auth.payload.student_id)
    .lte("start_date", date)
    .gte("end_date", date)
    .order("completed_at", { ascending: true, nullsFirst: true })   // 未完成在前
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) return NextResponse.json({ ok: false, error: error.message, code: "DB_ERROR" }, { status: 500 });

  const tasks = (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    subject: r.subject || "作业",          // 没填学科归"作业"
    task_type: r.task_type || "homework",
    source: r.source || "admin",
    estimated_minutes: r.estimated_minutes,
    actual_minutes: r.actual_minutes,
    cover_url: r.cover_url || null,
    completed_at: r.completed_at,
    is_completed: !!r.completed_at,
    teacher_name: r.meta?.teacher_name || null,        // 视频课快显
    event_registered_count: r.meta?.registered_count || null   // 活动快显
  }));

  // 按 subject 分组
  const groupMap = new Map<string, typeof tasks>();
  for (const t of tasks) {
    if (!groupMap.has(t.subject)) groupMap.set(t.subject, []);
    groupMap.get(t.subject)!.push(t);
  }
  const by_subject = Array.from(groupMap.entries()).map(([subject, list]) => ({
    subject,
    count: list.length,
    remaining_minutes: list.filter(t => !t.is_completed).reduce((s, t) => s + (t.estimated_minutes || 0), 0),
    tasks: list
  }));

  return NextResponse.json({
    ok: true,
    date,
    pending_count: tasks.filter(t => !t.is_completed).length,
    completed_count: tasks.filter(t => t.is_completed).length,
    by_subject
  });
}

/**
 * POST /api/app/assignments — 智能添加作业 (设计图 9)
 *
 *   header:  Authorization: Bearer <token>
 *   body:    { name, subject?, content_md?, image_url?, start_date, end_date?, estimated_minutes? }
 *   resp:    { ok, task }
 *
 * 默认值:
 *  - source = "student"  (App 端学生自建)
 *  - task_type = "homework"
 *  - end_date 缺省 = start_date
 *  - subject 缺省为 null, 前端展示归"作业"
 *
 * OCR(图片识别) 一期不接, image_url 仅作为附件/封面 cover_url 存档,
 * 二期甲方提供 OCR 接口后, 客户端先调 OCR 把识别文字回填到 name/content_md 再调本接口
 */
export async function POST(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({} as any));
  const name = String(body?.name || "").trim();
  const subject = body?.subject ? String(body.subject).trim() : null;
  const content_md = body?.content_md ? String(body.content_md) : null;
  const image_url = body?.image_url ? String(body.image_url).trim() : null;
  const startDateRaw = String(body?.start_date || "").trim();
  const endDateRaw = body?.end_date ? String(body.end_date).trim() : "";
  const estimated = typeof body?.estimated_minutes === "number" ? body.estimated_minutes : null;

  if (!name) {
    return NextResponse.json({ ok: false, error: "请填写作业内容", code: "MISSING_FIELDS" }, { status: 400 });
  }
  const start = toDateOnly(startDateRaw);
  if (!start) {
    return NextResponse.json({ ok: false, error: "起始时间格式必须 YYYY-MM-DD", code: "INVALID_DATE" }, { status: 400 });
  }
  const end = toDateOnly(endDateRaw) || start;
  if (end < start) {
    return NextResponse.json({ ok: false, error: "结束时间不能早于起始时间", code: "INVALID_DATE_RANGE" }, { status: 400 });
  }

  const sb = adminSupabase();
  // 拿学生的 channel/store 顺手挂上 (跟后台创建保持一致)
  const { data: student } = await sb.from("end_users")
    .select("channel_id, store_id, status")
    .eq("id", auth.payload.student_id).maybeSingle();
  if (!student) return NextResponse.json({ ok: false, error: "学生不存在", code: "NOT_FOUND" }, { status: 404 });
  if (student.status !== "active") {
    return NextResponse.json({ ok: false, error: "账号已禁用", code: "ACCOUNT_DISABLED" }, { status: 403 });
  }

  const id = shortId("as");
  const { data: created, error } = await sb.from("assignments")
    .insert({
      id,
      end_user_id: auth.payload.student_id,
      channel_id: student.channel_id,
      store_id: student.store_id,
      name,
      subject,
      task_type: "homework",
      source: "student",
      start_date: start,
      end_date: end,
      estimated_minutes: estimated,
      cover_url: image_url,         // 一期: 图片作为封面; 二期 OCR 后此字段可能改成识别文字
      content_md
    })
    .select("id, name, subject, task_type, source, start_date, end_date, estimated_minutes, cover_url, content_md, completed_at, created_at")
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message, code: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    task: {
      ...created,
      is_completed: !!(created as any).completed_at
    }
  });
}
