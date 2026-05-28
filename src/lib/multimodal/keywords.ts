/**
 * 从多模态 11 项分值生成「学习状态关键词」 — 纯查表规则, 不调 LLM
 * 用于平板首页 / 学生档案 的词云展示
 */
import type { MultimodalScores } from "./scoring";

type Rule = {
  metric: keyof MultimodalScores;
  /** 高分阈值, 分值 ≥ 此阈值时挂这个词 */
  highThreshold?: number;
  highKeyword?: string;
  /** 低分阈值, 分值 ≤ 此阈值时挂这个词 */
  lowThreshold?: number;
  lowKeyword?: string;
};

const RULES: Rule[] = [
  { metric: "concentration_level",    highThreshold: 75, highKeyword: "高度专注",   lowThreshold: 40, lowKeyword: "易走神" },
  { metric: "attention_duration",     highThreshold: 75, highKeyword: "续航在线",   lowThreshold: 40, lowKeyword: "注意力短" },
  { metric: "visual_distraction",                                                   lowThreshold: 50, lowKeyword: "眼神乱飘" },
  { metric: "auditory_distraction",                                                 lowThreshold: 50, lowKeyword: "易被打扰" },
  { metric: "switching_efficiency",   highThreshold: 75, highKeyword: "切换灵活",   lowThreshold: 40, lowKeyword: "切换卡顿" },
  { metric: "stress_speed",           highThreshold: 75, highKeyword: "反应敏捷",   lowThreshold: 40, lowKeyword: "反应慢" },
  { metric: "stress_regulation",      highThreshold: 75, highKeyword: "情绪自调",   lowThreshold: 40, lowKeyword: "压力难散" },
  { metric: "stress_tolerance",       highThreshold: 75, highKeyword: "耐压强",     lowThreshold: 40, lowKeyword: "耐压偏弱" },
  { metric: "stress_difference",      highThreshold: 75, highKeyword: "心态稳定",   lowThreshold: 40, lowKeyword: "心态波动" },
  { metric: "learning_fatigue",       highThreshold: 75, highKeyword: "状态清醒",   lowThreshold: 40, lowKeyword: "略显倦怠" },
  { metric: "learning_interest",      highThreshold: 80, highKeyword: "兴趣浓厚",   lowThreshold: 40, lowKeyword: "兴趣低迷" },
  { metric: "status_stability",       highThreshold: 75, highKeyword: "状态稳定",   lowThreshold: 40, lowKeyword: "状态起伏" },
  { metric: "emotional_adaptability", highThreshold: 75, highKeyword: "情绪适配",   lowThreshold: 40, lowKeyword: "情绪游离" }
];

/**
 * 从 11 项分值生成关键词 (最多 limit 个, 默认 6 个)
 * 优先级: 显著高分 / 显著低分 (越极端越前)
 */
export function extractKeywords(scores: MultimodalScores, limit = 6): string[] {
  const hits: { word: string; weight: number }[] = [];
  for (const r of RULES) {
    const v = scores[r.metric];
    if (typeof v !== "number") continue;
    if (r.highThreshold != null && r.highKeyword && v >= r.highThreshold) {
      hits.push({ word: r.highKeyword, weight: v - r.highThreshold });   // 越高分权重越大
    } else if (r.lowThreshold != null && r.lowKeyword && v <= r.lowThreshold) {
      hits.push({ word: r.lowKeyword, weight: r.lowThreshold - v });     // 越低分权重越大
    }
  }
  hits.sort((a, b) => b.weight - a.weight);
  // 去重 (理论上各规则关键词不重复, 兜底)
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { word } of hits) {
    if (!seen.has(word)) { seen.add(word); out.push(word); }
    if (out.length >= limit) break;
  }
  return out;
}
