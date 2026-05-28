/**
 * 月度家长信 — 渲染 prompt + 调扣子工作流
 *
 *   buildLetterContext  — 从 user_profiles + end_users 拉数据, 渲染 prefix 占位符
 *   generateLetter      — 完整流程: 拿模板 → 渲染 → 调扣子 → 返回信件正文
 *
 * 扣子工作流要求 (家长信专用, 跟主聊那条不复用):
 *   workflow_id: COZE_WORKFLOW_WISH_LETTER
 *   inputs:      { system_role, student_context, rules, year, month }
 *   outputs:     { letter }  // 纯正文字符串, 300-400 字
 * 未配置 token / workflow_id 时走 mock, 返回基于模板的占位文本, 不阻塞测试.
 */
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { runWorkflow, streamWorkflow, cozeConfigured, type CozeStreamEvent } from "@/lib/coze/client";

export type LetterTemplate = {
  id: string;
  code: string;
  name: string;
  system_role: string;
  prefix_template: string;
  rules: string;
};

export type LetterContext = {
  studentName: string;
  year: number;
  month: number;
  rendered: string;           // 已填充占位符的 student_context
  placeholders: Record<string, string>;
};

/** 简单字符串占位符渲染: {{key}} → value, 缺失保留原占位以便看到 */
function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([一-鿿A-Za-z0-9_\/、]+)\s*\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key] ?? "") : `{{${key}}}`
  );
}

function summarizeAnxiety(psy: any): string {
  const lv = psy?.["焦虑等级"];
  if (!lv) return "";
  const parts: string[] = [];
  for (const k of ["状态焦虑", "学习压力", "特质焦虑"]) {
    const v = lv?.[k];
    if (!v) continue;
    if (typeof v === "string") parts.push(`${k}: ${v}`);
    else parts.push(`${k}: ${v.title || v.label || ""}`.trim());
  }
  return parts.filter(Boolean).join("; ");
}

function summarizeMultimodal(mm: any): string {
  if (!mm) return "";
  const dim = mm?.dimensions;
  if (!dim) return "";
  return `专注 ${dim.concentration ?? "-"} · 抗压 ${dim.stress ?? "-"} · 状态 ${dim.status ?? "-"} · 综合 ${mm?.composite ?? "-"} · 状态标签: ${mm?.state_label ?? "-"}`;
}

/** 拉学生档案 + 渲染上下文 */
export async function buildLetterContext(input: {
  endUserId: string;
  year: number;
  month: number;
  template: LetterTemplate;
}): Promise<LetterContext> {
  const sb = adminSupabase();
  const [{ data: stu }, { data: prof }] = await Promise.all([
    sb.from("end_users").select("name, grade").eq("id", input.endUserId).maybeSingle(),
    sb.from("user_profiles").select("basic, knowledge, courses, today_state, psychology, ai_history, multimodal_latest, report_latest").eq("end_user_id", input.endUserId).maybeSingle()
  ]);
  const basic: any = (prof as any)?.basic || {};
  const know: any = (prof as any)?.knowledge || {};
  const courses: any = (prof as any)?.courses || {};
  const today: any = (prof as any)?.today_state || {};
  const psy: any = (prof as any)?.psychology || {};
  const ai: any = (prof as any)?.ai_history || {};
  const mm: any = (prof as any)?.multimodal_latest || {};

  const studentName = (stu as any)?.name || basic["学生姓名"] || "孩子";
  const grade = (stu as any)?.grade || basic["年级"] || basic["年级/班级"] || "";

  const placeholders: Record<string, string> = {
    "学生姓名": studentName,
    "年级": grade,
    "学科版本": basic["学科版本"] || basic["教材版本/所学学科"] || basic["学科"] || "",
    "学习层级": basic["学习层级"] || basic["培优/中等/基础薄弱"] || "",
    "年月": `${input.year}年${String(input.month).padStart(2, "0")}月`,

    "本月时长": today["本月时长"] || courses["本月时长"] || "",
    "作业完成": courses["作业完成"] || courses["刷题情况"] || "",
    "成绩段位": courses["成绩段位"] || "",
    "测评摘要": summarizeMultimodal(mm),
    "今日状态": [today["专注度"], today["正确率"], today["行为"]].filter(Boolean).join(" · "),

    "心态": psy["心态"] || psy["学习心态"] || "",
    "情绪": typeof psy["情绪"] === "string" ? psy["情绪"] : (psy["情绪"]?.label || ""),
    "动机": psy["动机"] || psy["学习动机"] || "",
    "焦虑摘要": summarizeAnxiety(psy),
    "性格": psy["性格"] || psy["性格适配"] || "",

    "兴趣": basic["兴趣"] || psy["兴趣"] || "",
    "兴趣说明": basic["兴趣说明"] || "",

    "ai互动话题": ai["话题"] || ai["高频提问"] || "",
    "ai情绪摘要": ai["情绪倾诉"] || ai["历史反馈"] || ""
  };

  const rendered = renderTemplate(input.template.prefix_template, placeholders);
  return { studentName, year: input.year, month: input.month, rendered, placeholders };
}

/** 从 prompt_templates 拿模板 */
export async function loadLetterTemplate(): Promise<LetterTemplate> {
  const sb = adminSupabase();
  const { data, error } = await sb.from("prompt_templates")
    .select("id, code, name, system_role, prefix_template, rules")
    .eq("code", "monthly_wish_letter")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("提示词模板 monthly_wish_letter 未找到, 请先应用 migration 20260528000032");
  return data as LetterTemplate;
}

/** mock 模式产出一封示例信, 主要用于联调阶段 (无扣子凭据) */
function mockLetter(ctx: LetterContext): string {
  const m = String(ctx.month).padStart(2, "0");
  return `这个月学习节奏整体偏紧, 但课堂出席和作业完成都按部就班, 没有掉队, 整体成绩段位稳定. 我自己每天保持刷题、复盘和跟进进度, 没有偷懒, 也清楚自己哪里还需要补.

说实话, 这个月有点累. 课业密度大、节奏紧凑, 题型也比之前难一点, 长时间高强度输入下来, 身心都有点紧绷. 这不是不想学, 也不是厌学, 就是长期坚持后正常的疲惫.

我一直喜欢的那件事, 是我自己的精神寄托, 累的时候、压力大的时候, 想到它就能稳住心态, 接着往下走. 它不会影响我学习, 反而支撑我扛过这些高压时段.

希望爸爸妈妈这个月能多理解一点我的压力, 不要因为兴趣就否定它. 也希望你们看到我一直在努力, 不只看最后的分数. 我清楚学习是主, 兴趣是辅, 我会继续自律, 稳步往前走.

[mock] ${ctx.year}年${m}月`;
}

/** 流式版: AsyncGenerator 直接推 delta 文本块给 SSE 路由 */
export async function* streamLetter(input: {
  endUserId: string;
  year: number;
  month: number;
}): AsyncGenerator<{ type: "context"; context: LetterContext } | { type: "delta"; text: string } | { type: "done"; content: string; mock: boolean; debugUrl?: string } | { type: "error"; message: string }> {
  let template: LetterTemplate;
  let context: LetterContext;
  try {
    template = await loadLetterTemplate();
    context = await buildLetterContext({ endUserId: input.endUserId, year: input.year, month: input.month, template });
  } catch (e: any) {
    yield { type: "error", message: e?.message || "初始化失败" };
    return;
  }
  yield { type: "context", context };

  const workflowId = process.env.COZE_WORKFLOW_WISH_LETTER || "";
  // mock 模式: 模拟流式吐字
  if (!cozeConfigured() || !workflowId) {
    const mockText = mockLetter(context);
    let full = "";
    for (const ch of mockText) {
      full += ch;
      yield { type: "delta", text: ch };
      await new Promise(r => setTimeout(r, 18));
    }
    yield { type: "done", content: full, mock: true };
    return;
  }

  let full = "";
  let debugUrl: string | undefined;
  try {
    for await (const evt of streamWorkflow({
      workflowId,
      parameters: {
        // 做法 A: system_role + rules 已写死在扣子工作流 LLM 节点的 System Prompt 里,
        // 这里只送动态变量. 如果改成做法 B (变量驱动), 把 system_role / rules 也送过去.
        student_context: context.rendered,
        year: context.year,
        month: context.month
      }
    })) {
      if (evt.type === "delta") {
        full += evt.text;
        yield { type: "delta", text: evt.text };
      } else if (evt.type === "done") {
        // 扣子 done 事件可能附最终 output
        const out: any = evt.output;
        if (!full && out) {
          const final = typeof out === "string" ? out : (out.letter || out.content || out.output || "");
          if (final) {
            full = String(final);
            yield { type: "delta", text: full };
          }
        }
        debugUrl = (evt.raw as any)?.debug_url || debugUrl;
      } else if (evt.type === "error") {
        yield { type: "error", message: evt.message };
        return;
      }
    }
    if (!full.trim()) {
      yield { type: "error", message: "扣子返回为空" };
      return;
    }
    yield { type: "done", content: full.trim(), mock: false, debugUrl };
  } catch (e: any) {
    yield { type: "error", message: e?.message || "流式调用失败" };
  }
}

export async function generateLetter(input: {
  endUserId: string;
  year: number;
  month: number;
}): Promise<{ ok: true; content: string; debugUrl?: string; mock: boolean; context: LetterContext; template: LetterTemplate } | { ok: false; error: string }> {
  try {
    const template = await loadLetterTemplate();
    const context = await buildLetterContext({ endUserId: input.endUserId, year: input.year, month: input.month, template });

    const workflowId = process.env.COZE_WORKFLOW_WISH_LETTER || "";
    if (!cozeConfigured() || !workflowId) {
      return { ok: true, content: mockLetter(context), mock: true, context, template };
    }

    const res = await runWorkflow({
      workflowId,
      parameters: {
        // 同 streamLetter, 做法 A: 只送 3 个动态变量
        student_context: context.rendered,
        year: context.year,
        month: context.month
      }
    });
    // 扣子返回 data 可能是 string 或 { letter: string } 或 { content/output }
    const raw = res.data;
    let content = "";
    if (typeof raw === "string") content = raw;
    else if (raw && typeof raw === "object") content = String(raw.letter || raw.content || raw.output || JSON.stringify(raw));
    if (!content.trim()) {
      return { ok: false, error: `扣子返回为空: ${res.msg || JSON.stringify(res.raw)}` };
    }
    return { ok: true, content: content.trim(), debugUrl: res.debug_url, mock: false, context, template };
  } catch (e: any) {
    return { ok: false, error: e?.message || "生成失败" };
  }
}
