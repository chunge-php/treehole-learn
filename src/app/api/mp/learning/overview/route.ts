/**
 * GET /api/mp/learning/overview — 家长小程序首页「学习情况概览」聚合数据
 *
 *   header:  Authorization: Bearer <mp_token>
 *   query:   ?endUserId=eu_xxx&period=today|week|month
 *   resp:    { ok, period, todo, focus_chart, radar, cloud_words, ai_sections }
 *
 * 切换 today/week/month 时:
 *  - todo: 重新统计该期间内的 assignments (plan_count / done_count)
 *  - focus_chart: 按小时聚合 student_study_sessions
 *  - radar: 取 user_profiles.multimodal_latest 三维度 (期间数据稀疏时复用最新一次)
 *  - cloud_words: 从 multimodal_latest.scores 查表生成
 *  - ai_sections: 从 user_profiles.basic / psychology / report_latest 拼几段
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getMpAuth } from "@/lib/mp-session";
import { extractKeywords } from "@/lib/multimodal/keywords";

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function getRange(period: "today" | "week" | "month"): { start: Date; end: Date; startStr: string; endStr: string } {
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;
  if (period === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  } else if (period === "week") {
    const dow = now.getDay() === 0 ? 7 : now.getDay();  // 周一为 1, 周日 7
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dow - 1), 0, 0, 0, 0);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }
  return { start, end: todayEnd, startStr: fmtDate(start), endStr: fmtDate(todayEnd) };
}

/** 简化版按小时聚合: 24 长度数组, 单位 % (天均) */
function aggregateHourlyPercent(
  sessions: Array<{ started_at: string; ended_at: string | null; last_heartbeat_at: string }>,
  start: Date,
  end: Date,
  totalDays: number
): number[] {
  const hourly = new Array(24).fill(0);
  for (const s of sessions) {
    const sStart = new Date(s.started_at);
    const sEnd = s.ended_at ? new Date(s.ended_at) : new Date(s.last_heartbeat_at);
    const sliceStart = new Date(Math.max(sStart.getTime(), start.getTime()));
    const sliceEnd = new Date(Math.min(sEnd.getTime(), end.getTime()));
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
  return hourly.map(min => Math.min(100, Math.round(min / Math.max(1, totalDays) / 60 * 100)));
}

export async function GET(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

  const url = new URL(req.url);
  const periodRaw = url.searchParams.get("period") || "today";
  const period = (["today", "week", "month"] as const).includes(periodRaw as any) ? periodRaw as "today" | "week" | "month" : "today";
  const endUserId = (url.searchParams.get("endUserId") || "").trim();
  if (!endUserId) {
    return NextResponse.json({ ok: false, error: "缺少 endUserId" }, { status: 400 });
  }

  const sb = adminSupabase();

  // 校验家长是否绑了该学生
  const { data: binding } = await sb.from("parent_bindings")
    .select("id").eq("parent_id", auth.parent_id).eq("end_user_id", endUserId).maybeSingle();
  if (!binding) {
    return NextResponse.json({ ok: false, error: "未绑定此学生", code: "NOT_BOUND" }, { status: 403 });
  }

  const range = getRange(period);
  const totalDays = Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / (24 * 3600 * 1000)));

  // 并发拿 assignments / student_study_sessions / user_profiles
  const [
    { data: assignments },
    { data: sessions },
    { data: profile }
  ] = await Promise.all([
    sb.from("assignments")
      .select("id, completed_at, start_date, end_date")
      .eq("end_user_id", endUserId)
      .lte("start_date", range.endStr)
      .gte("end_date", range.startStr),
    sb.from("student_study_sessions")
      .select("started_at, ended_at, last_heartbeat_at")
      .eq("end_user_id", endUserId)
      .gte("date", range.startStr)
      .lte("date", range.endStr),
    sb.from("user_profiles").select("basic, psychology, multimodal_latest, report_latest").eq("end_user_id", endUserId).maybeSingle()
  ]);

  // todo 统计
  const total = (assignments || []).length;
  const done = (assignments || []).filter((a: any) => !!a.completed_at).length;

  // focus_chart — 按小时聚合 (12 个采样点足以画曲线, 但小程序前端已经画了 13 个点, 跟着给 13)
  const hourlyPct = aggregateHourlyPercent(
    (sessions || []) as any[],
    range.start, range.end, totalDays
  );
  const sample13 = (arr: number[]) => arr.filter((_, i) => i % 2 === 0).concat([arr[23]]);   // 取偶数小时 + 23 时, 共 13 个

  // radar — multimodal_latest 三维度
  const mm: any = (profile as any)?.multimodal_latest || {};
  const radarData = [
    mm?.dimensions?.concentration ?? 0,
    mm?.dimensions?.stress ?? 0,
    mm?.dimensions?.status ?? 0
  ];

  // cloud_words — 从 11 项分值查表 (一期固定布局, 二期前端可改用词云组件)
  const keywords = mm?.scores ? extractKeywords(mm.scores, 12) : [];

  // ai_sections — 拼几段文字 (基础信息 + 心理状态 + 报告结论)
  const basic: any = (profile as any)?.basic || {};
  const psy: any = (profile as any)?.psychology || {};
  const rep: any = (profile as any)?.report_latest || {};
  const ai_sections: Array<{ title: string; text: string }> = [];
  if (basic["学生类型"] || basic["八格类型"]) {
    ai_sections.push({
      title: "学习画像",
      text: [basic["学生类型"], basic["八格类型"], basic["学生类型描述"]].filter(Boolean).join(" · ")
    });
  }
  if (psy["情绪"] || psy["焦虑等级"]) {
    const anx = psy["焦虑等级"] ? `状态焦虑 ${psy["焦虑等级"]?.状态焦虑 || "—"} · 学习压力 ${psy["焦虑等级"]?.学习压力 || "—"}` : "";
    ai_sections.push({
      title: "心理状态",
      text: [psy["情绪"], anx].filter(Boolean).join(" · ")
    });
  }
  if (mm?.state_label && mm?.comment) {
    ai_sections.push({ title: "今日状态", text: `${mm.state_label} — ${mm.comment}` });
  }

  return NextResponse.json({
    ok: true,
    period,
    range: { start: range.startStr, end: range.endStr },
    todo: {
      plan_count: total - done,
      done_count: done
    },
    focus_chart: {
      categories: ["0", "2", "4", "6", "8", "10", "12", "14", "16", "18", "20", "22", "24"],
      series: [
        { name: "我的数值", data: sample13(hourlyPct), lineType: "solid" },
        // 平均值: 同店其他学生暂略, 一期固定参考值, 二期补 (跟 /api/app/profile/focus-curve 类似)
        { name: "平均值",   data: [22, 30, 35, 42, 70, 55, 48, 50, 45, 40, 45, 25, 20], lineType: "dash" }
      ]
    },
    radar: {
      name: period === "today" ? "今日" : period === "week" ? "本周" : "本月",
      data: radarData
    },
    cloud_words: keywords.map((w, i) => ({
      text: w,
      // 随机位置, 二期前端改用词云组件就不需要给 x/y
      size: 28 + (i % 4) * 8,
      color: ["#1490ff", "#ff6a00", "#3CA272", "#73C0DE", "#FAC858", "#EE6666"][i % 6],
      x: 40 + (i * 67) % 440,
      y: 60 + (i * 53) % 320
    })),
    ai_sections
  });
}
