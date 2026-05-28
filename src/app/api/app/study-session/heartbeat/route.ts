/**
 * POST /api/app/study-session/heartbeat — 学生在 App 内活动时, 每 30 秒上报一次
 *
 *   header:  Authorization: Bearer <token>
 *   body:    { session_id: string }
 *   resp:    { ok, session_duration_sec, today_total_sec }
 *          | 410 SESSION_ENDED  (会话已结束/不存在, 客户端应重新调 /start)
 *
 * 服务端:
 *  - 校验 session 归属本学生
 *  - 校验 session 还没 ended_at
 *  - 更新 last_heartbeat_at = now, duration_sec = (now - started_at)
 *  - 顺手清理超时的 stale session (last_heartbeat > 2 分钟的)
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { closeStaleSessions, getTodayTotalSec } from "@/lib/study-session";

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
    .select("id, end_user_id, started_at, ended_at")
    .eq("id", sessionId).maybeSingle();
  if (!sess) {
    return NextResponse.json({ ok: false, error: "会话不存在, 请重新启动", code: "SESSION_ENDED" }, { status: 410 });
  }
  if (sess.end_user_id !== auth.payload.student_id) {
    return NextResponse.json({ ok: false, error: "无权访问此会话", code: "NOT_OWNER" }, { status: 403 });
  }
  if (sess.ended_at) {
    return NextResponse.json({ ok: false, error: "会话已结束, 请重新启动", code: "SESSION_ENDED" }, { status: 410 });
  }

  const now = new Date();
  const sessionDuration = Math.max(0,
    Math.floor((now.getTime() - new Date(sess.started_at).getTime()) / 1000));

  await sb.from("student_study_sessions").update({
    last_heartbeat_at: now.toISOString(),
    duration_sec: sessionDuration
  }).eq("id", sessionId);

  // 顺手关掉其他僵尸会话 (不阻塞)
  closeStaleSessions(auth.payload.student_id).catch(() => {});

  const today_total_sec = await getTodayTotalSec(auth.payload.student_id);

  return NextResponse.json({
    ok: true,
    session_duration_sec: sessionDuration,
    today_total_sec
  });
}
