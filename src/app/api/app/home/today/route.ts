/**
 * GET /api/app/home/today — 学生平板首页今日数据
 *
 *   header: Authorization: Bearer <token>
 *   resp:   { ok, greeting, status, multimodal?, game?, assignments_summary }
 *
 * 三态:
 *   no_eval  → 今天没做学习力测评 (优先级最高, 显示测评卡)
 *   no_face  → 测评做了但今天没做多模态 (显示"解锁今日学习状态")
 *   ready    → 都做了, 显示完整 3 卡
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { extractKeywords } from "@/lib/multimodal/keywords";

export const dynamic = "force-dynamic";

function todayLocalDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export async function GET(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  const sb = adminSupabase();
  const studentId = auth.payload.student_id;
  const todayStr = todayLocalDateStr();

  // 并发查 4 类数据
  const [
    { data: student },
    { data: profile },
    { data: todaysEvalReport },
    { data: assignments }
  ] = await Promise.all([
    sb.from("end_users").select("name, status").eq("id", studentId).maybeSingle(),
    sb.from("user_profiles").select("multimodal_latest, report_latest").eq("end_user_id", studentId).maybeSingle(),
    // 今日是否做过学习力测评 (status=completed 且 completed_at 是今天)
    sb.from("report_sessions")
      .select("id, completed_at")
      .eq("end_user_id", studentId)
      .eq("status", "completed")
      .gte("completed_at", `${todayStr}T00:00:00`)
      .order("completed_at", { ascending: false })
      .limit(1),
    // 今日活动中的作业 (start_date <= today <= end_date)
    sb.from("assignments")
      .select("id, name, completed_at, start_date, end_date")
      .eq("end_user_id", studentId)
      .lte("start_date", todayStr)
      .gte("end_date", todayStr)
      .limit(100)
  ]);

  if (!student) {
    return NextResponse.json({ ok: false, error: "学生不存在", code: "NOT_FOUND" }, { status: 404 });
  }
  if (student.status !== "active") {
    return NextResponse.json({ ok: false, error: "账号已被禁用", code: "ACCOUNT_DISABLED" }, { status: 403 });
  }

  const mm = (profile as any)?.multimodal_latest || null;
  const evalDoneToday = Array.isArray(todaysEvalReport) && todaysEvalReport.length > 0;
  const mmDoneToday = mm && isToday(mm.evaluated_at);

  // 三态判断 (优先级: 测评 → 人脸识别 → 完成)
  let status: "no_eval" | "no_face" | "ready";
  if (!evalDoneToday) status = "no_eval";
  else if (!mmDoneToday) status = "no_face";
  else status = "ready";

  // 通用问候 (后期可接 AI 个性化生成)
  const greeting = pickGreeting(student.name);

  const resp: any = {
    ok: true,
    greeting,
    status,
    student_name: student.name
  };

  if (status === "ready" && mm) {
    // 动力 = 综合分
    const vitality = typeof mm.composite === "number" ? mm.composite : 0;
    // 压力 = 100 - 抗压力维度均分 (抗压力高 → 压力低)
    const stressDim = mm.dimensions?.stress;
    const stress = typeof stressDim === "number" ? Math.max(0, 100 - stressDim) : null;
    // 关键词: 从 11 项分值查表
    const keywords = mm.scores ? extractKeywords(mm.scores) : [];

    resp.multimodal = {
      vitality,
      stress,
      state_label: mm.state_label || null,
      level: mm.level || null,
      comment: mm.comment || null,
      keywords,
      evaluated_at: mm.evaluated_at || null
    };

    // 解压游戏推荐 (从已经查好的 recommendation)
    const gameRec = mm.recommendation?.game;
    if (gameRec) {
      resp.game = {
        name: gameRec.name,
        keywords: gameRec.keywords,
        cover_url: null,           // 一期不返封面, 前端用默认图
        duration_min: 3            // 默认推荐时长 (设计图里"3分钟瞬间专注")
      };
    }
  }

  // 导学历今日摘要 (3 态都返, 让前端始终能展示导学历卡)
  resp.assignments_summary = buildAssignmentsSummary(assignments as any[] || []);

  return NextResponse.json(resp);
}

function pickGreeting(name: string): string {
  const greetings = [
    `${name}你好呀,欢迎来到橙新学习空间~`,
    `${name}今天也是元气满满的一天!`,
    `${name}回来啦~你的专属 AI 小助手已上线`,
    `${name}同学,准备好开启今天的学习了吗?`
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

function buildAssignmentsSummary(rows: any[]): {
  pending: number;
  completed: number;
  by_subject: Array<{ subject: string; count: number; remaining_minutes: number }>;
} {
  const pending = rows.filter(r => !r.completed_at).length;
  const completed = rows.filter(r => !!r.completed_at).length;
  // 一期: 学科信息暂时从 name 前缀简单提取, 后期 assignments 表加 subject 字段更准
  // 默认全归"作业"
  const bySubjectMap = new Map<string, { count: number; minutes: number }>();
  for (const r of rows) {
    if (r.completed_at) continue;
    const subject = inferSubject(r.name) || "作业";
    const item = bySubjectMap.get(subject) || { count: 0, minutes: 0 };
    item.count += 1;
    item.minutes += 15; // 默认每条 15 分钟 (一期 assignments 表没 estimated_minutes)
    bySubjectMap.set(subject, item);
  }
  return {
    pending,
    completed,
    by_subject: Array.from(bySubjectMap.entries()).map(([subject, v]) => ({
      subject,
      count: v.count,
      remaining_minutes: v.minutes
    }))
  };
}

/** 从作业名简单推断学科 (临时方案, 等 assignments 加 subject 字段后删掉) */
function inferSubject(name: string | null): string | null {
  if (!name) return null;
  const map: Array<[string, string]> = [
    ["数学", "数学"], ["语文", "语文"], ["英语", "英语"],
    ["物理", "物理"], ["化学", "化学"], ["生物", "生物"],
    ["历史", "历史"], ["地理", "地理"], ["政治", "政治"],
    ["手工", "手工"], ["读书", "读书会"]
  ];
  for (const [kw, subject] of map) {
    if (name.includes(kw)) return subject;
  }
  return null;
}
