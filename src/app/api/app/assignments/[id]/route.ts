/**
 * GET /api/app/assignments/:id — 任务详情 (支持 3 种 task_type)
 *
 *   header:  Authorization: Bearer <token>
 *   resp:    { ok, task: { ... 完整字段 } } | 401 / 403 / 404
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  const sb = adminSupabase();
  const { data: task } = await sb.from("assignments")
    .select("*")
    .eq("id", params.id).maybeSingle();
  if (!task) return NextResponse.json({ ok: false, error: "任务不存在", code: "NOT_FOUND" }, { status: 404 });
  if (task.end_user_id !== auth.payload.student_id) {
    return NextResponse.json({ ok: false, error: "无权访问此任务", code: "NOT_OWNER" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    task: {
      id: task.id,
      name: task.name,
      subject: task.subject || "作业",
      task_type: task.task_type || "homework",
      source: task.source || "admin",
      start_date: task.start_date,
      end_date: task.end_date,
      estimated_minutes: task.estimated_minutes,
      actual_minutes: task.actual_minutes,
      cover_url: task.cover_url || null,
      content_md: task.content_md || null,       // 图文 / 普通作业的内容
      video_url: task.video_url || null,         // 视频课的 url
      meta: task.meta || {},                      // 教师 / 活动 / 推荐元数据
      completed_at: task.completed_at,
      is_completed: !!task.completed_at,
      created_at: task.created_at,
      updated_at: task.updated_at
    }
  });
}
