/**
 * GET /api/app/assignments?date=YYYY-MM-DD — 当日任务列表 (按学科分组)
 *
 *   header:  Authorization: Bearer <token>
 *   query:   ?date=2026-05-28  (默认今天)
 *   resp:    {
 *     ok, date,
 *     pending_count, completed_count,
 *     by_subject: [ { subject, count, remaining_minutes, tasks: [...] } ]
 *   }
 *
 * 数据合并: 作业 (admin/parent/student) + 系统推荐 (recommendation, 心屿世界第三方)
 *  - 暂时全部走 assignments 表 source 字段区分; 推荐部分接通后端写入即可, 前端不变
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";

export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
