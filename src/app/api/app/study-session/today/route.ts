/**
 * GET /api/app/study-session/today — 拿当日累计学习时长 (秒) + 段数
 *
 *   header:  Authorization: Bearer <token>
 *   resp:    { ok, today_total_sec, session_count, has_active }
 *
 * 用于首页 / 个人中心展示「今日已学 32 分钟」之类
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { closeStaleSessions, getTodayTotalSec } from "@/lib/study-session";

export const dynamic = "force-dynamic";

function todayLocalDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  // 先清理僵尸会话再统计, 避免数据偏高
  await closeStaleSessions(auth.payload.student_id);

  const today_total_sec = await getTodayTotalSec(auth.payload.student_id);
  const sb = adminSupabase();
  const { data: rows } = await sb.from("student_study_sessions")
    .select("id, ended_at")
    .eq("end_user_id", auth.payload.student_id)
    .eq("date", todayLocalDateStr());

  const session_count = rows?.length || 0;
  const has_active = (rows || []).some((r: any) => !r.ended_at);

  return NextResponse.json({
    ok: true,
    today_total_sec,
    session_count,
    has_active
  });
}
