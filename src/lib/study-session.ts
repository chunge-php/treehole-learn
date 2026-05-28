/**
 * 学生学习时长 — 共享工具
 *  - 计算当日累计秒数
 *  - 自动 close 心跳超时的僵尸会话 (> 2 分钟)
 */
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";

export const HEARTBEAT_TIMEOUT_SEC = 120;     // 2 分钟没心跳视为离线

function todayLocalDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 自动关闭该学生所有已超时未关闭的会话 (last_heartbeat > 2min 前的) */
export async function closeStaleSessions(endUserId: string): Promise<number> {
  const sb = adminSupabase();
  const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_SEC * 1000).toISOString();
  const { data: stale } = await sb.from("student_study_sessions")
    .select("id, started_at, last_heartbeat_at")
    .eq("end_user_id", endUserId)
    .is("ended_at", null)
    .lt("last_heartbeat_at", cutoff);
  if (!stale || stale.length === 0) return 0;
  for (const s of stale) {
    const start = new Date((s as any).started_at).getTime();
    const last  = new Date((s as any).last_heartbeat_at).getTime();
    const dur   = Math.max(0, Math.floor((last - start) / 1000));
    await sb.from("student_study_sessions").update({
      ended_at: (s as any).last_heartbeat_at,
      duration_sec: dur
    }).eq("id", (s as any).id);
  }
  return stale.length;
}

/** 取学生当日累计在线学习秒数 (含所有已 close 的 + 当前 active 的从 started_at 到 now) */
export async function getTodayTotalSec(endUserId: string): Promise<number> {
  const sb = adminSupabase();
  const today = todayLocalDateStr();
  const { data } = await sb.from("student_study_sessions")
    .select("started_at, last_heartbeat_at, ended_at, duration_sec")
    .eq("end_user_id", endUserId)
    .eq("date", today);
  if (!data) return 0;
  let total = 0;
  const now = Date.now();
  for (const s of data as any[]) {
    if (s.ended_at) {
      total += s.duration_sec || 0;
    } else {
      // 活动中: 用 now (或 last_heartbeat_at 较小) 算到 started_at
      const start = new Date(s.started_at).getTime();
      const last  = new Date(s.last_heartbeat_at).getTime();
      const effective = Math.min(now, last + HEARTBEAT_TIMEOUT_SEC * 1000);  // 心跳超时上限
      total += Math.max(0, Math.floor((effective - start) / 1000));
    }
  }
  return total;
}
