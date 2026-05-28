/**
 * GET /api/mp/profile/stats — 我的页统计 (今日已学 / 坚持学习)
 *
 *   header:  Authorization: Bearer <mp_token>
 *   query:   ?endUserId=eu_xxx (省略=取家长当前/首选孩子)
 *   resp:    { ok, student:{id,name}, todayMinutes, streakDays }
 *
 * todayMinutes = 当日累计在线学习时长 (向下取整到分钟), 含活动中会话
 * streakDays   = 连续学习天数: 从今天向前数, 跳过"今天还没记录"避免早晨清零;
 *                只要今天/昨天起有连续记录, 就一直数到出现空档为止 (最多回溯 365 天)
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getMpAuth } from "@/lib/mp-session";
import { resolveChild } from "@/lib/mp-bindings";
import { closeStaleSessions, getTodayTotalSec } from "@/lib/study-session";

export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function computeStreak(endUserId: string): Promise<number> {
  const sb = adminSupabase();
  // 回溯一年, 拿所有有学习记录的日期
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);
  const { data } = await sb
    .from("student_study_sessions")
    .select("date")
    .eq("end_user_id", endUserId)
    .gte("date", fmtDate(oneYearAgo));
  const dates = new Set((data || []).map((r: any) => r.date as string));

  const today = new Date();
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // 今天还没学也不立刻清零, 从昨天起算
  if (!dates.has(fmtDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(fmtDate(cursor)) && streak < 366) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function GET(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const child = await resolveChild(auth.parent_id, url.searchParams.get("endUserId"));
    if (!child) {
      return NextResponse.json({ ok: true, student: null, todayMinutes: 0, streakDays: 0 });
    }

    // 先 close 僵尸会话保证 today 累计精确
    await closeStaleSessions(child.id);
    const [totalSec, streakDays] = await Promise.all([
      getTodayTotalSec(child.id),
      computeStreak(child.id)
    ]);

    return NextResponse.json({
      ok: true,
      student: { id: child.id, name: child.name },
      todayMinutes: Math.floor(totalSec / 60),
      streakDays
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "读取失败" }, { status: 500 });
  }
}
