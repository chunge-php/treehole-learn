/**
 * POST /api/app/assignments/:id/complete — 标记任务完成 / 取消完成
 *
 *   header:  Authorization: Bearer <token>
 *   body:    { completed: true | false, actual_minutes?: int }
 *            (默认 completed=true; 想取消传 false)
 *   resp:    { ok, task: { id, completed_at, actual_minutes, is_completed } }
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({} as any));
  const completed = body?.completed !== false;    // 默认完成
  const actualMinutes = typeof body?.actual_minutes === "number" ? body.actual_minutes : null;

  const sb = adminSupabase();
  const { data: task } = await sb.from("assignments")
    .select("id, end_user_id, completed_at")
    .eq("id", params.id).maybeSingle();
  if (!task) return NextResponse.json({ ok: false, error: "任务不存在", code: "NOT_FOUND" }, { status: 404 });
  if (task.end_user_id !== auth.payload.student_id) {
    return NextResponse.json({ ok: false, error: "无权操作此任务", code: "NOT_OWNER" }, { status: 403 });
  }

  const patch: any = {
    completed_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  };
  if (actualMinutes !== null) patch.actual_minutes = actualMinutes;

  const { data: updated, error } = await sb.from("assignments")
    .update(patch).eq("id", params.id)
    .select("id, completed_at, actual_minutes")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message, code: "DB_ERROR" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    task: {
      id: updated.id,
      completed_at: updated.completed_at,
      actual_minutes: updated.actual_minutes,
      is_completed: !!updated.completed_at
    }
  });
}
