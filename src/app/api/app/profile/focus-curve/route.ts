/**
 * GET /api/app/profile/focus-curve — 24 小时专注度曲线 (设计图 10 顶部折线)
 *
 *   header:  Authorization: Bearer <token>
 *   query:   ?days=1 | 7 | 30  (默认 7, 近 7 天每小时平均更稳定)
 *   resp:    { ok, days, hourly: [{hour, mine, average}], peak }
 *
 * 算法:
 *  - 拿学生最近 N 天的 student_study_sessions 按小时切片累计分钟数
 *  - 转 0-100%: 每小时最多 60 分钟 = 100%
 *  - N 天求每小时平均, 平滑掉单日抖动
 *  - average = 同店所有 active 学生的同样聚合 / 学生数 (作为参照线)
 *
 * 用途: 个人中心首屏的"我的专注时段"折线图, 标注学习黄金期 (峰值)
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";

export const dynamic = "force-dynamic";

type SessionRow = { started_at: string; ended_at: string | null; last_heartbeat_at: string };

/** 按小时累计学习分钟数, 返回 24 长度数组 (单位: 分钟) */
function aggregateHourlyMinutes(sessions: SessionRow[], windowStart: Date, windowEnd: Date): number[] {
  const hourly = new Array(24).fill(0);
  for (const s of sessions) {
    const sStart = new Date(s.started_at);
    const sEnd = s.ended_at ? new Date(s.ended_at) : new Date(s.last_heartbeat_at);
    const sliceStart = new Date(Math.max(sStart.getTime(), windowStart.getTime()));
    const sliceEnd = new Date(Math.min(sEnd.getTime(), windowEnd.getTime()));
    if (sliceEnd <= sliceStart) continue;

    let cursor = new Date(sliceStart);
    while (cursor < sliceEnd) {
      const hour = cursor.getHours();
      const nextHour = new Date(cursor);
      nextHour.setHours(hour + 1, 0, 0, 0);
      const segEnd = nextHour < sliceEnd ? nextHour : sliceEnd;
      const minutes = (segEnd.getTime() - cursor.getTime()) / 1000 / 60;
      hourly[hour] += Math.max(0, minutes);
      cursor = segEnd;
    }
  }
  return hourly;
}

/** 把累计分钟数除以天数 → 每小时日均分钟, 再转 0-100% */
function toPercent(hourlyMinutes: number[], days: number): number[] {
  return hourlyMinutes.map(min => {
    const avgPerDay = min / Math.max(1, days);
    return Math.min(100, Math.round(avgPerDay / 60 * 100));
  });
}

export async function GET(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get("days") || "7");
  const days = [1, 7, 30].includes(daysParam) ? daysParam : 7;

  const now = new Date();
  const windowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1), 0, 0, 0, 0);
  const windowStartDate = `${windowStart.getFullYear()}-${String(windowStart.getMonth() + 1).padStart(2, "0")}-${String(windowStart.getDate()).padStart(2, "0")}`;
  const windowEndDate = `${windowEnd.getFullYear()}-${String(windowEnd.getMonth() + 1).padStart(2, "0")}-${String(windowEnd.getDate()).padStart(2, "0")}`;

  const sb = adminSupabase();

  // 拿自己的 session + store_id (用来算同店平均)
  const [{ data: mySessions }, { data: student }] = await Promise.all([
    sb.from("student_study_sessions")
      .select("started_at, ended_at, last_heartbeat_at")
      .eq("end_user_id", auth.payload.student_id)
      .gte("date", windowStartDate)
      .lte("date", windowEndDate),
    sb.from("end_users").select("store_id").eq("id", auth.payload.student_id).maybeSingle()
  ]);

  const myMinutes = aggregateHourlyMinutes((mySessions || []) as any, windowStart, windowEnd);
  const mine = toPercent(myMinutes, days);

  // 同店其他 active 学生 (用来算平均参照线)
  let avgPercent = new Array(24).fill(0);
  if (student?.store_id) {
    const { data: peerIds } = await sb.from("end_users")
      .select("id")
      .eq("store_id", student.store_id)
      .eq("status", "active")
      .neq("id", auth.payload.student_id);
    const peerIdList = (peerIds || []).map((r: any) => r.id as string);
    if (peerIdList.length > 0) {
      const { data: peerSessions } = await sb.from("student_study_sessions")
        .select("started_at, ended_at, last_heartbeat_at")
        .in("end_user_id", peerIdList)
        .gte("date", windowStartDate)
        .lte("date", windowEndDate);
      const peerMinutes = aggregateHourlyMinutes((peerSessions || []) as any, windowStart, windowEnd);
      // 平均 = 累计分钟 / (天数 * 学生数)
      avgPercent = peerMinutes.map(min => {
        const avgPerStudentPerDay = min / Math.max(1, days * peerIdList.length);
        return Math.min(100, Math.round(avgPerStudentPerDay / 60 * 100));
      });
    }
  }

  const hourly = mine.map((m, h) => ({ hour: h, mine: m, average: avgPercent[h] }));

  // 找峰值 (我的最高小时)
  let peakHour = 0, peakValue = 0;
  for (let h = 0; h < 24; h++) {
    if (mine[h] > peakValue) { peakValue = mine[h]; peakHour = h; }
  }
  const peak = peakValue > 0
    ? { hour: peakHour, value: peakValue, label: pickPeakLabel(peakHour) }
    : null;

  return NextResponse.json({
    ok: true,
    days,
    window_start_date: windowStartDate,
    window_end_date: windowEndDate,
    hourly,
    peak
  });
}

/** 按小时段返回更友好的"黄金期"文案 */
function pickPeakLabel(hour: number): string {
  if (hour >= 6 && hour < 9) return "晨学黄金期";
  if (hour >= 9 && hour < 12) return "上午黄金期";
  if (hour >= 12 && hour < 14) return "午间专注期";
  if (hour >= 14 && hour < 17) return "下午黄金期";
  if (hour >= 17 && hour < 20) return "傍晚黄金期";
  if (hour >= 20 && hour < 23) return "夜学黄金期";
  return "深夜专注期";
}
