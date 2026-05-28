/**
 * POST /api/app/eval/start — 开始学习力测评
 *
 * 设计: 一次性测评 (学情/学格稳定属性, 不每天测)
 *  - 若学生有 in_progress 会话, 直接返回该会话 (支持续答)
 *  - 若学生历史已有 completed 会话, 返回 ALREADY_COMPLETED 提示去个人中心
 *  - 否则创建新会话, 返回 session_id + total_questions
 *
 *   body:  (空, 学生身份从 token 取)
 *   resp:  { ok, session_id, code, total_questions, answered_count, status }
 *        | 401 / 403 / 410 (ALREADY_COMPLETED, 已完成过, 走个人中心)
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { shortId } from "@/lib/utils";

export const dynamic = "force-dynamic";

function buildSerial(num: number): string {
  return "XXL" + String(Math.trunc(num)).padStart(7, "0");
}

export async function POST(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;
  const sb = adminSupabase();
  const studentId = auth.payload.student_id;

  // 学生 + 当前学生信息
  const { data: student } = await sb
    .from("end_users")
    .select("id, name, status")
    .eq("id", studentId).maybeSingle();
  if (!student) return NextResponse.json({ ok: false, error: "学生不存在", code: "NOT_FOUND" }, { status: 404 });
  if (student.status !== "active") return NextResponse.json({ ok: false, error: "账号已禁用", code: "ACCOUNT_DISABLED" }, { status: 403 });

  // 优先返回进行中会话 (续答)
  const { data: existing } = await sb
    .from("report_sessions")
    .select("id, code, total_questions, answered_count, status")
    .eq("end_user_id", studentId)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      ok: true,
      session_id: existing.id,
      code: existing.code,
      total_questions: existing.total_questions,
      answered_count: existing.answered_count,
      status: existing.status,
      resumed: true
    });
  }

  // 如果学生已完成过测评, 提示去个人中心重测 (设计要求: 首次一次性)
  const { data: completedAny } = await sb
    .from("report_sessions")
    .select("id, code, completed_at")
    .eq("end_user_id", studentId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (completedAny) {
    return NextResponse.json({
      ok: false,
      error: "学习力测评已完成过, 如需重测请前往个人中心",
      code: "ALREADY_COMPLETED",
      last_completed_session_id: completedAny.id
    }, { status: 410 });
  }

  // 创建新会话 — 快照当前所有 active 题
  const { data: qs, error } = await sb
    .from("assessments")
    .select("id")
    .eq("status", "active")
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message, code: "DB_ERROR" }, { status: 500 });
  const ids = (qs || []).map((q: any) => q.id);
  if (!ids.length) return NextResponse.json({ ok: false, error: "题库暂无题目", code: "NO_QUESTIONS" }, { status: 500 });

  const id = shortId("rs");
  const { data: created, error: e2 } = await sb.from("report_sessions").insert({
    id,
    name: student.name,
    end_user_id: studentId,
    question_ids: ids,
    total_questions: ids.length,
    answered_count: 0,
    status: "in_progress"
  }).select("seq_no").single();
  if (e2) return NextResponse.json({ ok: false, error: e2.message, code: "DB_ERROR" }, { status: 500 });

  const code = buildSerial((created as any)?.seq_no ?? 0);
  await sb.from("report_sessions").update({ code }).eq("id", id);

  return NextResponse.json({
    ok: true,
    session_id: id,
    code,
    total_questions: ids.length,
    answered_count: 0,
    status: "in_progress",
    resumed: false
  });
}
