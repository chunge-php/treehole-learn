/**
 * POST /api/app/eval/sessions/:id/answer — 提交单题作答
 *
 *  header: Authorization: Bearer <token>
 *  body:   { assessment_id: string, answer: string | null }
 *  resp:   { ok, answered, total, completed, profile_synced? }
 *
 * 完成时 (最后一题答完 / 状态首次翻成 completed):
 *   - 立刻生成报告写入 report_sessions.report_data
 *   - 调 updateProfileFromReport 同步学生档案 (basic / psychology / report_latest)
 *   - 同步进度 / 字段反馈在响应 profile_synced 字段里
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { shortId } from "@/lib/utils";
import { buildReportForSession } from "@/lib/report/build";
import { updateProfileFromReport } from "@/lib/profile/sync";
import { analyzeAudio } from "@/lib/report/fazhanmao";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;
  const sb = adminSupabase();

  const body = await req.json().catch(() => ({} as any));
  const assessmentId = String(body?.assessment_id || "").trim();
  const answer: string | null = body?.answer == null ? null : String(body.answer);
  if (!assessmentId) {
    return NextResponse.json({ ok: false, error: "缺少 assessment_id", code: "MISSING_FIELDS" }, { status: 400 });
  }

  // 校验会话归属
  const { data: sess } = await sb
    .from("report_sessions")
    .select("id, end_user_id, total_questions, status, question_ids, code")
    .eq("id", params.id).maybeSingle();
  if (!sess) return NextResponse.json({ ok: false, error: "记录不存在", code: "NOT_FOUND" }, { status: 404 });
  if (sess.end_user_id !== auth.payload.student_id) {
    return NextResponse.json({ ok: false, error: "无权访问此测评", code: "NOT_OWNER" }, { status: 403 });
  }
  const validIds: string[] = Array.isArray(sess.question_ids) ? sess.question_ids : [];
  if (!validIds.includes(assessmentId)) {
    return NextResponse.json({ ok: false, error: "该题不属于此测评", code: "INVALID_QUESTION" }, { status: 400 });
  }

  // 语音题: answer 为音频 URL → 调发展猫
  let extend_json: any = undefined;
  const { data: qInfo } = await sb.from("assessments").select("qtype").eq("id", assessmentId).maybeSingle();
  if ((qInfo?.qtype as string) === "语音题" && answer) {
    try { extend_json = await analyzeAudio(answer, (sess as any).code || params.id); }
    catch (e) { console.error("[app/eval] analyzeAudio failed:", e); }
  }

  // upsert 作答
  const { data: existing } = await sb
    .from("report_answers")
    .select("id")
    .eq("session_id", params.id)
    .eq("assessment_id", assessmentId)
    .maybeSingle();

  const payload: any = { answer, answered_at: new Date().toISOString() };
  if (extend_json !== undefined) payload.extend_json = extend_json;

  if (existing) {
    const { error } = await sb.from("report_answers").update(payload).eq("id", existing.id);
    if (error) return NextResponse.json({ ok: false, error: error.message, code: "DB_ERROR" }, { status: 500 });
  } else {
    const { error } = await sb.from("report_answers")
      .insert({ id: shortId("ra"), session_id: params.id, assessment_id: assessmentId, ...payload });
    if (error) return NextResponse.json({ ok: false, error: error.message, code: "DB_ERROR" }, { status: 500 });
  }

  // 进度统计
  const { count } = await sb.from("report_answers")
    .select("id", { count: "exact", head: true })
    .eq("session_id", params.id);
  const answered = count || 0;
  const total = sess.total_questions || 0;
  const completed = total > 0 && answered >= total;

  const patch: any = { answered_count: answered, updated_at: new Date().toISOString() };
  const justCompleted = completed && sess.status !== "completed";
  if (justCompleted) { patch.status = "completed"; patch.completed_at = new Date().toISOString(); }
  if (!completed && sess.status === "completed") { patch.status = "in_progress"; patch.completed_at = null; }
  await sb.from("report_sessions").update(patch).eq("id", params.id);

  // 首次完成 → 立刻生成报告 + 同步档案
  let profile_synced: { ok: boolean; fields: string[]; error?: string } | undefined;
  if (justCompleted) {
    try {
      const r = await buildReportForSession(params.id);
      if (r?.report) {
        await sb.from("report_sessions").update({ report_data: r.report }).eq("id", params.id);
        await updateProfileFromReport({
          end_user_id: sess.end_user_id,
          report_data: r.report,
          session_id: params.id,
          by: null
        });
      }
      // 查 profile 实际填了哪些字段
      const { data: prof } = await sb.from("user_profiles")
        .select("basic, psychology, report_latest")
        .eq("end_user_id", sess.end_user_id).maybeSingle();
      const filled: string[] = [];
      if ((prof as any)?.basic?.["学生类型"]) filled.push("basic.学生类型");
      if ((prof as any)?.basic?.["八格类型"]) filled.push("basic.八格类型");
      if ((prof as any)?.psychology?.["焦虑等级"]) filled.push("psychology.焦虑等级");
      if ((prof as any)?.psychology?.["情绪"]) filled.push("psychology.情绪");
      if ((prof as any)?.report_latest) filled.push("report_latest");
      profile_synced = { ok: true, fields: filled };
    } catch (e: any) {
      console.error("[app/eval] profile sync failed:", e?.message || e);
      profile_synced = { ok: false, fields: [], error: e?.message || String(e) };
    }
  }

  return NextResponse.json({
    ok: true,
    answered,
    total,
    completed,
    ...(profile_synced ? { profile_synced } : {})
  });
}
