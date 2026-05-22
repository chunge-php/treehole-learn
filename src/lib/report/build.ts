// 报告数据构建 (无鉴权核心) — 后台 action 与公开预览页共用
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { buildReportItems, generateReport } from "./generate";

/** 按会话 id 生成报告 (value1~value10); 找不到或未完成返回 null */
export async function buildReportForSession(sessionId: string) {
  const sb = adminSupabase();
  const { data: session } = await sb.from("report_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) return null;

  const ids: string[] = Array.isArray((session as any).question_ids) ? (session as any).question_ids : [];
  const { data: allQ } = await sb.from("assessments").select("id, dimension, qtype, answer, project_name, options");
  const qmap = new Map((allQ || []).map((q: any) => [q.id, q]));
  const questions = ids.map(id => qmap.get(id)).filter(Boolean);

  const { data: ans } = await sb.from("report_answers").select("assessment_id, answer, extend_json").eq("session_id", sessionId);
  const answers: Record<string, string | null> = {};
  const extendMap: Record<string, any> = {};
  (ans || []).forEach((a: any) => { answers[a.assessment_id] = a.answer; if (a.extend_json) extendMap[a.assessment_id] = a.extend_json; });

  const items = buildReportItems(questions as any, answers, extendMap);
  const dates = String((session as any).completed_at || (session as any).created_at || "").slice(0, 10);
  return {
    status: (session as any).status as string,
    report: generateReport(items, { name: (session as any).name, code: (session as any).code || "", dates }),
  };
}
