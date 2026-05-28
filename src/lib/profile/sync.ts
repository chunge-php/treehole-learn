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

/** 测评报告完成 → 更新档案
 *  report_data 结构来自 src/lib/report/generate.ts (value1..value10), 字段语义:
 *    value1 学生类型 + 描述           → basic.学生类型 / report_latest.summary
 *    value2 多元性向各维度分数 (k-v)  → report_latest.summary.多元性向
 *    value3 八格类型 + 解读           → basic.八格类型 / report_latest.summary
 *    value4 焦虑等级 (状态/特质/学习) → psychology.焦虑等级
 *    value5 焦虑分数                  → psychology.焦虑分数
 *    value8 兴趣六型 (霍兰德 top3 + 区分性 + 匹配专业) → report_latest.summary.兴趣
 *    value9/10 整体结论与建议         → report_latest.summary.结论 / 建议
 */
export async function updateProfileFromReport(input: {
  end_user_id: string;
  report_data: any;
  session_id: string;
  by?: string | null;
}) {
  const sb = adminSupabase();
  const { end_user_id, report_data: r, session_id, by = null } = input;

  // 取现有档案做合并 (不覆盖其它字段已有内容)
  const { data: cur } = await sb.from("user_profiles").select("basic, psychology").eq("end_user_id", end_user_id).maybeSingle();
  const basic = { ...(cur?.basic || {}) };
  const psychology = { ...(cur?.psychology || {}) };

  if (r?.value1?.title) basic["学生类型"] = r.value1.title;
  if (r?.value1?.describe) basic["学生类型描述"] = r.value1.describe;
  if (r?.value3?.title) basic["八格类型"] = r.value3.title;
  if (r?.value3?.str) basic["八格说明"] = r.value3.str;

  if (r?.value4) {
    psychology["焦虑等级"] = {
      状态焦虑: r.value4.status_anxiety,
      特质焦虑: r.value4.trait_anxiety,
      学习压力: r.value4.study_anxiety
    };
    // 顺手填提示词模板里的「情绪」「心态」字段, 取最高强度做语义化
    const worst = pickWorstAnxiety(r.value4);
    if (worst) psychology["情绪"] = worst;
  }
  if (Array.isArray(r?.value5)) {
    psychology["焦虑分数"] = Object.fromEntries(r.value5.map((x: any) => [x.title, x.value]));
  }

  const report_latest = {
    session_id,
    summary: {
      学生类型: r?.value1?.title || null,
      八格类型: r?.value3?.title || null,
      焦虑等级: r?.value4 || null,
      焦虑分数: Array.isArray(r?.value5) ? r.value5 : null,
      多元性向: r?.value2 || null,
      兴趣六型: r?.value8 ? {
        career_name: r.value8.career_name,
        top3: r.value8.top3_arr || r.value8.top3,
        区分性: r.value8.distinguish,
        和谐度: r.value8.harmony_value,
        匹配专业: r.value8.major_arr
      } : null,
      报告结论: r?.value9 || null,
      发展建议: r?.value10 || null
    },
    evaluated_at: new Date().toISOString()
  };

  const source_log = await appendSourceLog(end_user_id, "report", by);

  const { error } = await sb.from("user_profiles").upsert({
    end_user_id,
    basic, psychology,
    report_latest,
    source_log,
    updated_by: by,
    updated_at: new Date().toISOString()
  }, { onConflict: "end_user_id" });
  if (error) throw new Error(error.message);
}

/**
 * 把扣子档案分析工作流返回的 JSON, 深度合并到 user_profiles 各分片
 *  - basic / today_state / psychology 标量字段: 新值覆盖
 *  - knowledge.mastered/weak/blind 数组字段: 追加去重 (兼容 weak_points 等模型自由发挥的别名)
 *  - ai_history 字段: 忽略 (该字段由 updateProfileFromChat 维护, 避免污染 recent_chats)
 *  - 未知顶层 key: 忽略 (避免污染表结构)
 *  返回本次实际写入的字段路径列表 (供前端 toast 提示)
 */
export async function mergeProfileUpdate(input: {
  end_user_id: string;
  update: any;
  by?: string | null;
}): Promise<string[]> {
  const sb = adminSupabase();
  const { end_user_id, update, by = null } = input;
  if (!update || typeof update !== "object") return [];

  const { data: cur } = await sb.from("user_profiles")
    .select("basic, knowledge, psychology, today_state")
    .eq("end_user_id", end_user_id).maybeSingle();

  const basic       = { ...(cur?.basic       || {}) };
  const knowledge   = { ...(cur?.knowledge   || {}) };
  const psychology  = { ...(cur?.psychology  || {}) };
  const today_state = { ...(cur?.today_state || {}) };

  const changed: string[] = [];

  // basic: 简单覆盖
  if (update.basic && typeof update.basic === "object") {
    for (const [k, v] of Object.entries(update.basic)) {
      if (v == null || v === "") continue;
      if (basic[k] !== v) { basic[k] = v; changed.push(`basic.${k}`); }
    }
  }

  // knowledge: 三个数组字段, 追加去重; 兼容别名 weak_points/mastered_points/blind_points
  if (update.knowledge && typeof update.knowledge === "object") {
    const aliasMap: Record<string, "mastered" | "weak" | "blind"> = {
      mastered: "mastered", mastered_points: "mastered",
      weak: "weak", weak_points: "weak", weaknesses: "weak",
      blind: "blind", blind_points: "blind", blind_spots: "blind"
    };
    for (const [rawKey, rawVal] of Object.entries(update.knowledge)) {
      const target = aliasMap[rawKey];
      if (!target) continue;
      const arr: string[] = Array.isArray(rawVal) ? rawVal : (typeof rawVal === "string" ? [rawVal] : []);
      const existing: string[] = Array.isArray(knowledge[target]) ? knowledge[target] : [];
      const merged = Array.from(new Set([...existing, ...arr.filter(x => typeof x === "string" && x.trim())]));
      if (merged.length !== existing.length) {
        knowledge[target] = merged;
        changed.push(`knowledge.${target}`);
      }
    }
  }

  // psychology: 标量覆盖
  if (update.psychology && typeof update.psychology === "object") {
    for (const [k, v] of Object.entries(update.psychology)) {
      if (v == null || v === "") continue;
      if (psychology[k] !== v) { psychology[k] = v; changed.push(`psychology.${k}`); }
    }
  }

  // today_state: 标量覆盖
  if (update.today_state && typeof update.today_state === "object") {
    for (const [k, v] of Object.entries(update.today_state)) {
      if (v == null || v === "") continue;
      if (today_state[k] !== v) { today_state[k] = v; changed.push(`today_state.${k}`); }
    }
  }

  if (changed.length === 0) return [];

  const { error } = await sb.from("user_profiles").upsert({
    end_user_id,
    basic, knowledge, psychology, today_state,
    updated_by: by,
    updated_at: new Date().toISOString()
  }, { onConflict: "end_user_id" });
  if (error) throw new Error(error.message);
  return changed;
}

/** AI 聊天完成一轮 → 累积到 ai_history (滑动窗口 20 条 + 计数 + 最近时间) */
export async function updateProfileFromChat(input: {
  end_user_id: string;
  user_message: string;
  assistant_message: string;
  by?: string | null;
}) {
  const sb = adminSupabase();
  const { end_user_id, user_message, assistant_message, by = null } = input;

  const { data: cur } = await sb.from("user_profiles")
    .select("ai_history").eq("end_user_id", end_user_id).maybeSingle();
  const ai_history: any = { ...(cur?.ai_history || {}) };
  const recent_chats: any[] = Array.isArray(ai_history.recent_chats) ? ai_history.recent_chats : [];
  recent_chats.unshift({
    at: new Date().toISOString(),
    user: user_message.slice(0, 200),                   // 学生提问 (截 200 字)
    assistant: assistant_message.slice(0, 500)          // AI 回答摘要 (截 500 字)
  });
  ai_history.recent_chats = recent_chats.slice(0, 20);  // 滑动窗口保留最近 20 条
  ai_history.last_chat_at = new Date().toISOString();
  ai_history.total_chat_count = (Number(ai_history.total_chat_count) || 0) + 1;

  const { error } = await sb.from("user_profiles").upsert({
    end_user_id,
    ai_history,
    updated_by: by,
    updated_at: new Date().toISOString()
  }, { onConflict: "end_user_id" });
  if (error) throw new Error(error.message);
}

/** 取焦虑三项里最重的等级做心理状态语义化; 容错: value4 字段可能是字符串/数字/对象 */
function pickWorstAnxiety(v: any): string | null {
  if (!v) return null;
  const order = ["重度", "中度", "轻度", "正常"];
  // 任何类型都 toString, 再过滤掉空值
  const all = [v?.status_anxiety, v?.trait_anxiety, v?.study_anxiety]
    .filter(x => x !== undefined && x !== null && x !== "")
    .map(x => typeof x === "object" ? JSON.stringify(x) : String(x));
  if (!all.length) return null;
  for (const lv of order) {
    const hit = all.find(x => x.includes(lv));
    if (hit) return hit;
  }
  return all[0];
}

function scoreToBand(score: number, bands: [string, string, string, string]): string {
  if (score < 30) return bands[0];
  if (score < 60) return bands[1];
  if (score < 80) return bands[2];
  return bands[3];
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
