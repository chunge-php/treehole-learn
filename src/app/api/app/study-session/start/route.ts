/**
 * POST /api/app/study-session/start — 学生进入 App 主页时调一次, 启动学习时长会话
 *
 *   header:  Authorization: Bearer <token>
 *   body:    { device_info?: { brand, model, os_version, app_version } }
 *   resp:    { ok, session_id, started_at, today_total_sec }
 *
 * 副作用: 自动关闭该学生所有已存在的 active session (避免重复计时, 比如多设备登录)
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { shortId } from "@/lib/utils";
import { getTodayTotalSec } from "@/lib/study-session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({} as any));
  const deviceInfo = (body?.device_info && typeof body.device_info === "object") ? body.device_info : {};

  const sb = adminSupabase();

  // 先关闭该学生所有 active session (用其 last_heartbeat 作为 ended_at, 避免双重计时)
  const { data: actives } = await sb.from("student_study_sessions")
    .select("id, started_at, last_heartbeat_at")
    .eq("end_user_id", auth.payload.student_id)
    .is("ended_at", null);
  for (const s of actives || []) {
    const dur = Math.max(0,
      Math.floor((new Date((s as any).last_heartbeat_at).getTime() - new Date((s as any).started_at).getTime()) / 1000));
    await sb.from("student_study_sessions").update({
      ended_at: (s as any).last_heartbeat_at,
      duration_sec: dur
    }).eq("id", (s as any).id);
  }

  const id = shortId("sss");
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const { data: created, error } = await sb.from("student_study_sessions")
    .insert({
      id,
      end_user_id: auth.payload.student_id,
      started_at: now.toISOString(),
      last_heartbeat_at: now.toISOString(),
      date: todayStr,
      device_info: deviceInfo
    })
    .select("id, started_at")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message, code: "DB_ERROR" }, { status: 500 });

  const today_total_sec = await getTodayTotalSec(auth.payload.student_id);

  return NextResponse.json({
    ok: true,
    session_id: created.id,
    started_at: created.started_at,
    today_total_sec
  });
}
