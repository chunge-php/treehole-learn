/**
 * 学生个人档案 同步入口
 * 多模态测评 / 测评报告 / 后续其他测试完成后, 统一通过这里更新 user_profiles
 */
import { adminSupabase } from "@/lib/supabase/admin";
import type { EvaluationResult } from "@/lib/multimodal/scoring";

type Source = "multimodal" | "report" | "other";

async function appendSourceLog(end_user_id: string, source: Source, by: string | null) {
  const sb = adminSupabase();
  const { data } = await sb.from("user_profiles").select("source_log").eq("end_user_id", end_user_id).maybeSingle();
  const log: any[] = Array.isArray((data as any)?.source_log) ? (data as any).source_log : [];
  log.unshift({ source, at: new Date().toISOString(), by });
  // 保留最近 50 条
  return log.slice(0, 50);
}

/** 多模态测评完成 → 更新档案 */
export async function updateProfileFromMultimodal(input: {
  end_user_id: string;
  result: EvaluationResult;
  externalJson: Record<string, any>;
  by?: string | null;
}) {
  const sb = adminSupabase();
  const { end_user_id, result, externalJson, by = null } = input;

  const multimodal_latest = {
    composite: result.composite,
    level: result.final_level,
    raw_level: result.raw_level,
    state_label: result.state_label,
    comment: result.comment,
    dimensions: result.dimensions,
    scores: result.scores,
    recommendation: result.recommendation,
    adjustments: result.adjustments,
    external_json: externalJson,
    evaluated_at: new Date().toISOString()
  };

  // 顺手把"今日状态"中的专注度/疲劳/兴趣同步过去, 供 AI 模板渲染
  const today_state_patch = {
    专注度: scoreToBand(result.scores.concentration_level, ["浮躁敷衍", "疲惫烦躁", "轻微走神", "专注"]),
    疲劳: scoreToBand(result.scores.learning_fatigue, ["重度疲劳", "明显疲劳", "略疲", "清醒"]),
    兴趣: scoreToBand(result.scores.learning_interest, ["排斥", "一般", "感兴趣", "高度投入"])
  };

  const source_log = await appendSourceLog(end_user_id, "multimodal", by);

  const { error } = await sb.from("user_profiles").upsert({
    end_user_id,
    multimodal_latest,
    today_state: today_state_patch,
    source_log,
    updated_by: by,
    updated_at: new Date().toISOString()
  }, { onConflict: "end_user_id" });
  if (error) throw new Error(error.message);
}

/** 测评报告完成 → 更新档案 (用于发展猫等纸笔测评维度) */
export async function updateProfileFromReport(input: {
  end_user_id: string;
  report_data: any;
  session_id: string;
  by?: string | null;
}) {
  const sb = adminSupabase();
  const { end_user_id, report_data, session_id, by = null } = input;

  const report_latest = {
    session_id,
    summary: extractReportSummary(report_data),
    evaluated_at: new Date().toISOString()
  };

  const source_log = await appendSourceLog(end_user_id, "report", by);

  const { error } = await sb.from("user_profiles").upsert({
    end_user_id,
    report_latest,
    source_log,
    updated_by: by,
    updated_at: new Date().toISOString()
  }, { onConflict: "end_user_id" });
  if (error) throw new Error(error.message);
}

function scoreToBand(score: number, bands: [string, string, string, string]): string {
  if (score < 30) return bands[0];
  if (score < 60) return bands[1];
  if (score < 80) return bands[2];
  return bands[3];
}

function extractReportSummary(data: any): Record<string, any> {
  if (!data || typeof data !== "object") return {};
  // 尽量抽取可用字段, 不强依赖结构
  return {
    holland: data?.holland?.top || data?.holland_top,
    pluralism: data?.pluralism?.top || data?.pluralism_top,
    self_report: data?.self_report?.summary,
    fazhanmao: data?.fazhanmao?.summary || data?.multimodal?.summary
  };
}

// ===== 模板渲染 =====
/** 把 user_profiles 数据填充进 prompt 模板的 {{占位符}} */
export function renderPrompt(template: string, profile: any, endUser: any): string {
  const map: Record<string, string> = {
    学生姓名: endUser?.name || "未填写",
    "年级/班级": endUser?.grade || profile?.basic?.grade || "未填写",
    "教材版本/所学学科": profile?.basic?.subject || "未填写",
    "培优/中等/基础薄弱": profile?.basic?.level || "未填写",
    已掌握: fmtList(profile?.knowledge?.mastered),
    薄弱: fmtList(profile?.knowledge?.weak),
    盲区: fmtList(profile?.knowledge?.blind),
    关联前置: fmtList(profile?.knowledge?.related),
    完课进度: profile?.courses?.progress || "未填写",
    刷题情况: profile?.courses?.practice || "未填写",
    课堂表现: profile?.courses?.classroom || "未填写",
    历史水平: profile?.courses?.history || "未填写",
    今日时长: profile?.today_state?.duration || profile?.today_state?.今日时长 || "未填写",
    专注度: profile?.today_state?.专注度 || "未填写",
    正确率: profile?.today_state?.正确率 || "未填写",
    行为: profile?.today_state?.行为 || "未填写",
    心态: profile?.psychology?.心态 || "未填写",
    情绪: profile?.psychology?.情绪 || "未填写",
    动机: profile?.psychology?.动机 || "未填写",
    性格: profile?.psychology?.性格 || "未填写",
    互动风格: profile?.ai_history?.style || "未填写",
    提问习惯: profile?.ai_history?.habit || "未填写",
    讲解接受度: profile?.ai_history?.acceptance || "未填写",
    历史反馈: profile?.ai_history?.feedback || "未填写"
  };
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => map[key.trim()] ?? `{{${key}}}`);
}

function fmtList(v: any): string {
  if (!v) return "未填写";
  if (Array.isArray(v)) return v.length ? v.join("、") : "未填写";
  return String(v);
}
