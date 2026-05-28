/**
 * POST /api/app/study-session/end — 学生退出登录 / 离开页面时调用
 *
 *   header:  Authorization: Bearer <token>
 *   body:    { session_id: string }
 *   resp:    { ok, session_duration_sec, today_total_sec }
 *
 * 已结束的会话再调返回当前状态, 不报错 (幂等); 不存在的会话返 410
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { getTodayTotalSec } from "@/lib/study-session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({} as any));
  const sessionId = String(body?.session_id || "").trim();
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "缺少 session_id", code: "MISSING_FIELDS" }, { status: 400 });
  }

  const sb = adminSupabase();
  const { data: sess } = await sb.from("student_study_sessions")
    .select("id, end_user_id, started_at, ended_at, duration_sec")
    .eq("id", sessionId).maybeSingle();
  if (!sess) {
    return NextResponse.json({ ok: false, error: "会话不存在", code: "SESSION_ENDED" }, { status: 410 });
  }
  if (sess.end_user_id !== auth.payload.student_id) {
    return NextResponse.json({ ok: false, error: "无权操作此会话", code: "NOT_OWNER" }, { status: 403 });
  }

  let session_duration_sec = sess.duration_sec || 0;
  if (!sess.ended_at) {
    const now = new Date();
    session_duration_sec = Math.max(0,
      Math.floor((now.getTime() - new Date(sess.started_at).getTime()) / 1000));
    await sb.from("student_study_sessions").update({
      ended_at: now.toISOString(),
      last_heartbeat_at: now.toISOString(),
      duration_sec: session_duration_sec
    }).eq("id", sessionId);
  }

  const today_total_sec = await getTodayTotalSec(auth.payload.student_id);

  return NextResponse.json({
    ok: true,
    session_duration_sec,
    today_total_sec
  });
}
