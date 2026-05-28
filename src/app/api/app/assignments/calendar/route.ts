/**
 * GET /api/app/assignments/calendar?month=YYYY-MM — 月历分布 (每天任务数 + 完成数)
 *
 *   header:  Authorization: Bearer <token>
 *   query:   ?month=2026-05  (默认本月)
 *   resp:    { ok, month, stats: [{ date, total, completed }] }
 *
 * 用于设计图 6 右侧月历视图: 在有任务的日期下方画红点 / 完成度小条
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  let month = url.searchParams.get("month") || "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    const d = new Date();
    month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  const [yy, mm] = month.split("-").map(n => parseInt(n, 10));
  const firstDay = `${month}-01`;
  const lastDay = `${month}-${new Date(yy, mm, 0).getDate()}`;

  // 任意一天 d 满足 start_date <= d <= end_date 就算这天有任务
  // 一次查 month 内所有跟该范围相交的 assignments
  const sb = adminSupabase();
  const { data, error } = await sb.from("assignments")
    .select("start_date, end_date, completed_at")
    .eq("end_user_id", auth.payload.student_id)
    .lte("start_date", lastDay)
    .gte("end_date", firstDay)
    .limit(5000);
  if (error) return NextResponse.json({ ok: false, error: error.message, code: "DB_ERROR" }, { status: 500 });

  // 按天累加 total / completed
  const map = new Map<string, { total: number; completed: number }>();
  const daysInMonth = new Date(yy, mm, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    map.set(`${month}-${String(d).padStart(2, "0")}`, { total: 0, completed: 0 });
  }

  for (const a of (data || [])) {
    const s = new Date(a.start_date + "T00:00:00");
    const e = new Date(a.end_date + "T00:00:00");
    const cursor = new Date(Math.max(s.getTime(), new Date(firstDay + "T00:00:00").getTime()));
    const endStop = new Date(Math.min(e.getTime(), new Date(lastDay + "T00:00:00").getTime()));
    while (cursor.getTime() <= endStop.getTime()) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const entry = map.get(key);
      if (entry) {
        entry.total += 1;
        if (a.completed_at) entry.completed += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const stats = Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
  return NextResponse.json({ ok: true, month, stats });
}
