"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { shortId } from "@/lib/utils";
import { analyzeAudio, SAMPLE_AUDIO } from "@/lib/report/fazhanmao";
import { uploadAudioToObs, obsConfigured } from "@/lib/report/huawei-obs";
import { buildReportForSession } from "@/lib/report/build";
import { updateProfileFromReport } from "@/lib/profile/sync";

/** 报告流水号: XXL + 7位补零 */
function buildSerial(num: number): string {
  const s = String(Math.trunc(num));
  return "XXL" + s.padStart(7, "0");
}

export type ReportSessionRow = {
  id: string;
  name: string;
  remark: string | null;
  total_questions: number;
  answered_count: number;
  status: "in_progress" | "completed";
  completed_at: string | null;
  created_at: string;
  end_user_id: string | null;
};

/** 报告记录列表 (倒序) */
export async function listReportSessions(): Promise<ReportSessionRow[]> {
  requireAdmin();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("report_sessions")
    .select("id, name, remark, total_questions, answered_count, status, completed_at, created_at, end_user_id")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as ReportSessionRow[];
}

/** 终端学生 (含渠道/店铺名) — 给测评创建/多模态测试下拉用 */
export async function listEndUsersForSelect(q?: string) {
  requireAdmin();
  const sb = adminSupabase();
  let qb = sb
    .from("end_users")
    .select("id, name, phone, grade, store_id, channel_id, stores(name), channels(name)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(200);
  const kw = (q || "").trim();
  if (kw) qb = qb.or(`name.ilike.%${kw}%,phone.ilike.%${kw}%`);
  const { data, error } = await qb;
  if (error) throw new Error(error.message);
  return (data || []).map((u: any) => ({
    id: u.id as string,
    name: u.name as string,
    phone: (u.phone as string) || "",
    grade: (u.grade as string) || "",
    store: u.stores?.name as string | undefined,
    channel: u.channels?.name as string | undefined
  }));
}

/** 新建报告记录: 关联真实终端学生, 快照当前所有「启用」题的顺序 */
export async function createReportSession(input: { end_user_id: string; remark?: string }) {
  const s = requireAdmin();
  const endUserId = (input.end_user_id || "").trim();
  if (!endUserId) throw new Error("请选择受测学生");
  const sb = adminSupabase();

  const { data: eu } = await sb.from("end_users").select("id, name").eq("id", endUserId).maybeSingle();
  if (!eu) throw new Error("学生不存在");

  const { data: qs, error } = await sb
    .from("assessments")
    .select("id")
    .eq("status", "active")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  const ids = (qs || []).map((q: any) => q.id);
  if (!ids.length) throw new Error("题库暂无启用的题目, 无法创建测评");

  const id = shortId("rs");
  const { data: created, error: e2 } = await sb.from("report_sessions").insert({
    id,
    name: eu.name,
    end_user_id: endUserId,
    remark: input.remark?.trim() || null,
    question_ids: ids,
    total_questions: ids.length,
    answered_count: 0,
    status: "in_progress",
    created_by: s.account_id
  }).select("seq_no").single();
  if (e2) throw new Error(e2.message);
  const code = buildSerial((created as any)?.seq_no ?? 0);
  await sb.from("report_sessions").update({ code }).eq("id", id);
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
    .select("id, total_questions, status, question_ids, code")
    .eq("id", sessionId)
    .maybeSingle();
  if (!sess) throw new Error("记录不存在");
  const validIds: string[] = Array.isArray(sess.question_ids) ? sess.question_ids : [];
  if (!validIds.includes(assessmentId)) throw new Error("该题不属于此测评记录");

  // 语音题: answer 为音频 URL → 调发展猫拿焦虑分
  let extend_json: any = undefined;
  const { data: qInfo } = await sb.from("assessments").select("qtype").eq("id", assessmentId).maybeSingle();
  if ((qInfo?.qtype as string) === "语音题" && answer) {
    extend_json = await analyzeAudio(answer, (sess as any).code || sessionId);
  }

  const { data: existing } = await sb
    .from("report_answers")
    .select("id")
    .eq("session_id", sessionId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();

  const payload: any = { answer, answered_at: new Date().toISOString() };
  if (extend_json !== undefined) payload.extend_json = extend_json;

  if (existing) {
    const { error } = await sb.from("report_answers").update(payload).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("report_answers")
      .insert({ id: shortId("ra"), session_id: sessionId, assessment_id: assessmentId, ...payload });
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

  return { answered, total, completed, extend: extend_json ?? null };
}

/** 测试用: 给所有未答题随机填一个有效答案并标记完成; 语音题用测试音频调发展猫拿焦虑分 */
export async function quickFillAnswers(sessionId: string) {
  requireAdmin();
  const sb = adminSupabase();

  const { data: sess } = await sb
    .from("report_sessions")
    .select("id, question_ids, total_questions, code")
    .eq("id", sessionId)
    .maybeSingle();
  if (!sess) throw new Error("记录不存在");
  const ids: string[] = Array.isArray(sess.question_ids) ? sess.question_ids : [];

  const { data: existing } = await sb.from("report_answers").select("assessment_id, answer").eq("session_id", sessionId);
  const answerMap: Record<string, string | null> = {};
  (existing || []).forEach((a: any) => { answerMap[a.assessment_id] = a.answer; });

  const { data: allQ } = await sb.from("assessments").select("id, options, qtype");
  const qmap = new Map((allQ || []).map((q: any) => [q.id, q]));

  // 语音题: 用测试音频调发展猫拿焦虑分 (一次性算好, 题量通常仅 1 道)
  let voiceExtend: any = null;
  const hasVoice = ids.some(qid => !(qid in answerMap) && (qmap.get(qid) as any)?.qtype === "语音题");
  if (hasVoice) voiceExtend = await analyzeAudio(SAMPLE_AUDIO, (sess as any).code || sessionId);

  const toInsert: any[] = [];
  for (const qid of ids) {
    if (qid in answerMap) continue;
    const q: any = qmap.get(qid);
    const opts = Array.isArray(q?.options) ? q.options : [];
    const isVoice = q?.qtype === "语音题";
    let val = "(语音作答)";
    let extend: any = undefined;
    if (isVoice) { val = SAMPLE_AUDIO; extend = voiceExtend; }
    else if (opts.length) { val = opts[Math.floor(Math.random() * opts.length)]?.value || "A"; }
    const row: any = { id: shortId("ra"), session_id: sessionId, assessment_id: qid, answer: val };
    if (extend !== undefined) row.extend_json = extend;
    toInsert.push(row);
    answerMap[qid] = val;
  }

  for (let i = 0; i < toInsert.length; i += 200) {
    const { error } = await sb.from("report_answers").insert(toInsert.slice(i, i + 200));
    if (error) throw new Error(error.message);
  }

  const answered = ids.filter(id => id in answerMap).length;
  const total = sess.total_questions || ids.length;
  const completed = total > 0 && answered >= total;
  await sb.from("report_sessions").update({
    answered_count: answered,
    status: completed ? "completed" : "in_progress",
    completed_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }).eq("id", sessionId);

  revalidatePath("/assessments/reports");
  return { answers: answerMap, answered, total, completed, filled: toInsert.length };
}

/** 用测试语音作答语音题 (调发展猫拿真实焦虑分) */
export async function answerVoiceWithSample(sessionId: string, assessmentId: string) {
  requireAdmin();
  return saveAnswer(sessionId, assessmentId, SAMPLE_AUDIO);
}

/** 上传语音音频到华为 OBS, 返回可被发展猫读取的 URL */
export async function uploadVoiceAudio(formData: FormData, sessionId: string) {
  requireAdmin();
  if (!obsConfigured()) throw new Error("华为 OBS 未配置, 暂用测试语音");
  const sb = adminSupabase();
  const { data: sess } = await sb.from("report_sessions").select("code").eq("id", sessionId).maybeSingle();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("未选择文件");
  const ext = (file.name.split(".").pop() || "wav").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  const { url } = await uploadAudioToObs(buf, {
    uid: "1",
    code: (sess as any)?.code || sessionId,
    ext,
    contentType: file.type || "audio/wav",
  });
  return { url };
}

/** 生成报告数据 (value1~value10), 供结果页渲染; 完成态下顺手落库 + 同步学生档案 */
export async function generateSessionReport(sessionId: string) {
  const s = requireAdmin();
  const r = await buildReportForSession(sessionId);
  if (!r?.report) return null;

  // 仅在 completed 时持久化 + 同步档案
  if (r.status === "completed") {
    const sb = adminSupabase();
    const { data: sess } = await sb
      .from("report_sessions")
      .select("end_user_id, report_data")
      .eq("id", sessionId)
      .maybeSingle();

    // 首次完成 → 写入 report_data
    if (sess && !sess.report_data) {
      await sb.from("report_sessions").update({ report_data: r.report }).eq("id", sessionId);
    }
    // 有关联学生 → 同步档案
    if (sess?.end_user_id) {
      try {
        await updateProfileFromReport({
          end_user_id: sess.end_user_id,
          report_data: r.report,
          session_id: sessionId,
          by: s.account_id
        });
      } catch (e) {
        // 同步失败不影响报告渲染
        console.error("[profile sync] report → profile failed:", e);
      }
    }
  }
  return r.report;
}

export async function deleteReportSession(id: string) {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb.from("report_sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/assessments/reports");
  return { ok: true };
}
