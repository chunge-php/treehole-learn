"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { shortId } from "@/lib/utils";

export type ReportSessionRow = {
  id: string;
  name: string;
  remark: string | null;
  total_questions: number;
  answered_count: number;
  status: "in_progress" | "completed";
  completed_at: string | null;
  created_at: string;
};

/** 报告记录列表 (倒序) */
export async function listReportSessions(): Promise<ReportSessionRow[]> {
  requireAdmin();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("report_sessions")
    .select("id, name, remark, total_questions, answered_count, status, completed_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as ReportSessionRow[];
}

/** 新建报告记录: 快照当前所有「启用」题的顺序 */
export async function createReportSession(input: { name: string; remark?: string }) {
  const s = requireAdmin();
  const name = (input.name || "").trim();
  if (!name) throw new Error("请填写记录名称");
  const sb = adminSupabase();

  const { data: qs, error } = await sb
    .from("assessments")
    .select("id")
    .eq("status", "active")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  const ids = (qs || []).map((q: any) => q.id);
  if (!ids.length) throw new Error("题库暂无启用的题目, 无法创建测评");

  const id = shortId("rs");
  const { error: e2 } = await sb.from("report_sessions").insert({
    id,
    name,
    remark: input.remark?.trim() || null,
    question_ids: ids,
    total_questions: ids.length,
    answered_count: 0,
    status: "in_progress",
    created_by: s.account_id
  });
  if (e2) throw new Error(e2.message);
  revalidatePath("/assessments/reports");
  return { id };
}

/** 报告记录详情: 会话 + 按快照顺序的题目 + 已答 map */
export async function getReportSessionDetail(id: string) {
  requireAdmin();
  const sb = adminSupabase();
  const { data: session } = await sb.from("report_sessions").select("*").eq("id", id).maybeSingle();
  if (!session) return null;

  const ids: string[] = Array.isArray(session.question_ids) ? session.question_ids : [];
  // 一次拉全部题再按快照顺序排 (避免 in() 400 个 id 的超长 URL)
  const { data: allQ } = await sb
    .from("assessments")
    .select("id, title, description, cover_url, media_urls, dimension, qtype, options, project_name, sort_order");
  const map = new Map((allQ || []).map((q: any) => [q.id, q]));
  const questions = ids.map(qid => map.get(qid)).filter(Boolean);

  const { data: ans } = await sb.from("report_answers").select("assessment_id, answer").eq("session_id", id);
  const answers: Record<string, string | null> = {};
  (ans || []).forEach((a: any) => { answers[a.assessment_id] = a.answer; });

  return { session, questions, answers };
}

/** 提交单题作答 (每答一题即调用); 返回最新进度与是否已答完 */
export async function saveAnswer(sessionId: string, assessmentId: string, answer: string | null) {
  requireAdmin();
  const sb = adminSupabase();

  const { data: sess } = await sb
    .from("report_sessions")
    .select("id, total_questions, status, question_ids")
    .eq("id", sessionId)
    .maybeSingle();
  if (!sess) throw new Error("记录不存在");
  const validIds: string[] = Array.isArray(sess.question_ids) ? sess.question_ids : [];
  if (!validIds.includes(assessmentId)) throw new Error("该题不属于此测评记录");

  const { data: existing } = await sb
    .from("report_answers")
    .select("id")
    .eq("session_id", sessionId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();

  if (existing) {
    const { error } = await sb.from("report_answers")
      .update({ answer, answered_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("report_answers")
      .insert({ id: shortId("ra"), session_id: sessionId, assessment_id: assessmentId, answer });
    if (error) throw new Error(error.message);
  }

  // 精确统计已答数
  const { count } = await sb.from("report_answers")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  const answered = count || 0;
  const total = sess.total_questions || 0;
  const completed = total > 0 && answered >= total;

  const patch: any = { answered_count: answered, updated_at: new Date().toISOString() };
  if (completed && sess.status !== "completed") { patch.status = "completed"; patch.completed_at = new Date().toISOString(); }
  if (!completed && sess.status === "completed") { patch.status = "in_progress"; patch.completed_at = null; }
  await sb.from("report_sessions").update(patch).eq("id", sessionId);

  return { answered, total, completed };
}

export async function deleteReportSession(id: string) {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb.from("report_sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/assessments/reports");
  return { ok: true };
}
