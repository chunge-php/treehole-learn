/**
 * GET /api/app/eval/sessions/:id — 拿测评会话详情 (题目列表 + 已答 map)
 *
 *   header: Authorization: Bearer <token>
 *   resp:   { ok, session, questions, answers }
 *         | 401 / 403 (NOT_OWNER) / 404
 *
 * 会话只能被自己访问, 防止串号
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;
  const sb = adminSupabase();

  const { data: session } = await sb.from("report_sessions")
    .select("id, code, end_user_id, total_questions, answered_count, status, completed_at, created_at, question_ids")
    .eq("id", params.id).maybeSingle();
  if (!session) return NextResponse.json({ ok: false, error: "记录不存在", code: "NOT_FOUND" }, { status: 404 });
  if (session.end_user_id !== auth.payload.student_id) {
    return NextResponse.json({ ok: false, error: "无权访问此测评", code: "NOT_OWNER" }, { status: 403 });
  }

  const ids: string[] = Array.isArray(session.question_ids) ? session.question_ids : [];
  // 拉题面 (按快照顺序)
  const { data: allQ } = await sb
    .from("assessments")
    .select("id, title, description, cover_url, media_urls, dimension, qtype, options, project_name, sort_order");
  const map = new Map((allQ || []).map((q: any) => [q.id, q]));
  const questions = ids.map(qid => map.get(qid)).filter(Boolean);

  // 已答 map
  const { data: ans } = await sb.from("report_answers")
    .select("assessment_id, answer, answered_at")
    .eq("session_id", params.id);
  const answers: Record<string, string | null> = {};
  (ans || []).forEach((a: any) => { answers[a.assessment_id] = a.answer; });

  return NextResponse.json({
    ok: true,
    session: {
      id: session.id,
      code: session.code,
      total_questions: session.total_questions,
      answered_count: session.answered_count,
      status: session.status,
      completed_at: session.completed_at,
      created_at: session.created_at
    },
    questions,
    answers
  });
}
