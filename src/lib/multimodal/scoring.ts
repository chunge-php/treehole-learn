/**
 * 多模态学习状态测评 — 算分 / 等级 / 推荐 / JSON 输出
 * 算法依据: shuchai/《学习力项目多模态交互的技术需求文档.docx》3.3 节
 *
 * 11 个 0-100 指标:
 *   专注力 (40%): concentration_level / attention_duration / visual_distraction / auditory_distraction / switching_efficiency
 *   抗压力 (30%): stress_speed / stress_regulation / stress_tolerance / stress_difference
 *   学习状态 (30%): learning_fatigue / learning_interest / status_stability / emotional_adaptability
 *
 * 第三方接口未到位前, 本地随机生成分值用于联调和后台测试。
 */

export type MultimodalScores = {
  // 专注力 5项
  concentration_level: number;
  attention_duration: number;
  visual_distraction: number;
  auditory_distraction: number;
  switching_efficiency: number;
  // 抗压力 4项
  stress_speed: number;
  stress_regulation: number;
  stress_tolerance: number;
  stress_difference: number;
  // 学习状态 4项
  learning_fatigue: number;
  learning_interest: number;
  status_stability: number;
  emotional_adaptability: number;
};

export const SCORE_KEYS: (keyof MultimodalScores)[] = [
  "concentration_level", "attention_duration", "visual_distraction", "auditory_distraction", "switching_efficiency",
  "stress_speed", "stress_regulation", "stress_tolerance", "stress_difference",
  "learning_fatigue", "learning_interest", "status_stability", "emotional_adaptability"
];

export const SCORE_LABELS: Record<keyof MultimodalScores, { dim: string; label: string }> = {
  concentration_level:    { dim: "专注力", label: "专注度" },
  attention_duration:     { dim: "专注力", label: "注意力持续时长" },
  visual_distraction:     { dim: "专注力", label: "视觉分心 (反向, 高=不分心)" },
  auditory_distraction:   { dim: "专注力", label: "听觉分心 (反向, 高=不分心)" },
  switching_efficiency:   { dim: "专注力", label: "注意力切换效率" },
  stress_speed:           { dim: "抗压力", label: "压力响应速度" },
  stress_regulation:      { dim: "抗压力", label: "压力调节能力" },
  stress_tolerance:       { dim: "抗压力", label: "压力耐受阈值" },
  stress_difference:      { dim: "抗压力", label: "压力表现差异" },
  learning_fatigue:       { dim: "学习状态", label: "学习疲劳度 (反向, 高=不疲劳)" },
  learning_interest:      { dim: "学习状态", label: "学习兴趣度" },
  status_stability:       { dim: "学习状态", label: "状态稳定性" },
  emotional_adaptability: { dim: "学习状态", label: "情绪适配度" }
};

const WEIGHTS = {
  // 5 个专注力指标各 0.08, 4 个抗压力各 0.075, 4 个学习状态各 0.075
  concentration_level: 0.08, attention_duration: 0.08, visual_distraction: 0.08, auditory_distraction: 0.08, switching_efficiency: 0.08,
  stress_speed: 0.075, stress_regulation: 0.075, stress_tolerance: 0.075, stress_difference: 0.075,
  learning_fatigue: 0.075, learning_interest: 0.075, status_stability: 0.075, emotional_adaptability: 0.075
} satisfies Record<keyof MultimodalScores, number>;

export type DimensionScores = {
  concentration: number;  // 专注力 综合
  stress: number;         // 抗压力 综合
  status: number;         // 学习状态 综合
};

/** 三个一级维度的平均分 (文档定义: 各级取平均) */
export function dimensionScores(s: MultimodalScores): DimensionScores {
  const avg = (...xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  return {
    concentration: avg(s.concentration_level, s.attention_duration, s.visual_distraction, s.auditory_distraction, s.switching_efficiency),
    stress: avg(s.stress_speed, s.stress_regulation, s.stress_tolerance, s.stress_difference),
    status: avg(s.learning_fatigue, s.learning_interest, s.status_stability, s.emotional_adaptability)
  };
}

/** 加权综合分 (0-100) */
export function compositeScore(s: MultimodalScores): number {
  let sum = 0;
  for (const k of SCORE_KEYS) sum += s[k] * WEIGHTS[k];
  return Math.round(sum);
}

// ===== 15 级映射 =====
type Level = {
  level: number;
  range: [number, number]; // [min, max), 最高一档 [90, 100]
  state: string;
  comment: string;
  game: { name: string; keywords: string };
  course: { name: string; keywords: string };
};

const LEVELS: Level[] = [
  { level: 1,  range: [90, 101], state: "超棒学习状态",     comment: "今天状态全开，专注又轻松，学习效率超在线，继续保持这份好节奏～",
    game:   { name: "【高阶专注训练】快速记忆 / 舒尔特进阶", keywords: "专注、进阶、高效" },
    course: { name: "【学霸方法课】高效时间管理 + 深度专注法", keywords: "技巧、高效、进阶" } },
  { level: 2,  range: [80, 90],  state: "极佳学习状态",     comment: "专注度和兴趣都在线，能稳住心态高效学，稍微调整细节会更完美",
    game:   { name: "【专注耐力小游戏】数字消消 / 听觉专注挑战", keywords: "专注、耐力、兴趣" },
    course: { name: "【优化微课】抗压力小技巧 + 注意力精细化管理", keywords: "压力、专注、优化" } },
  { level: 3,  range: [70, 80],  state: "良好学习状态",     comment: "整体表现很不错，学习稳得住，只要稍微注意小细节就更出色啦",
    game:   { name: "【专注力巩固】视觉追踪 / 短时记忆训练", keywords: "专注、巩固、稳定" },
    course: { name: "【习惯微课】高效听课法 + 错题复盘小课", keywords: "方法、稳定、提升" } },
  { level: 4,  range: [65, 70],  state: "稳定学习状态",     comment: "学习节奏正常，能坚持完成任务，继续保持就是稳步进步的节奏",
    game:   { name: "【节奏小游戏】听觉反应 / 专注接力", keywords: "专注、节奏、坚持" },
    course: { name: "【基础微课】持续学习习惯 + 简单放松法", keywords: "习惯、稳定、调节" } },
  { level: 5,  range: [60, 65],  state: "正常学习状态",     comment: "基础状态在线，能跟上学习节奏，稍微提升专注会更轻松高效",
    game:   { name: "【抗干扰小游戏】环境干扰下专注训练", keywords: "分心、专注、抗干扰" },
    course: { name: "【提升微课】提升课堂专注力 + 压力基础调节", keywords: "专注、压力、提升" } },
  { level: 6,  range: [55, 60],  state: "需微调状态",       comment: "学习有点小波动啦，稍微休息一下、调整环境，很快就能找回状态",
    game:   { name: "【回神小游戏】快速集中 / 注意力唤醒", keywords: "走神、专注、唤醒" },
    course: { name: "【调整微课】如何快速找回状态 + 减压小技巧", keywords: "状态、压力、调整" } },
  { level: 7,  range: [50, 55],  state: "轻微波动状态",     comment: "今天容易被小事情打扰，学习时稳一稳心神，短休息后会好很多",
    game:   { name: "【静心小游戏】冥想互动 / 呼吸专注训练", keywords: "干扰、静心、专注" },
    course: { name: "【方法微课】排除环境干扰 + 情绪稳定法", keywords: "干扰、情绪、状态" } },
  { level: 8,  range: [45, 50],  state: "需关注状态",       comment: "有点累或容易分心啦，及时歇一歇，放松后再学效果会更好",
    game:   { name: "【放松小游戏】眼动放松 / 短时趣味训练", keywords: "疲劳、分心、放松" },
    course: { name: "【舒缓微课】学习疲劳恢复 + 科学休息法", keywords: "疲劳、休息、调整" } },
  { level: 9,  range: [40, 45],  state: "需调整状态",       comment: "我察觉到专注力下降明显，该停下来放松、补充精力啦",
    game:   { name: "【基础专注小游戏】舒尔特方格 / 简单听觉训练", keywords: "专注、压力、基础" },
    course: { name: "【入门微课】专注力训练入门 + 压力释放方法", keywords: "专注、调节、入门" } },
  { level: 10, range: [35, 40],  state: "需休息状态",       comment: "明显感到疲惫啦，强行学习效率不高，先好好休息再继续更合适",
    game:   { name: "【休息类小游戏】轻松脑力放松 / 趣味小互动", keywords: "疲劳、休息、放松" },
    course: { name: "【休整微课】高效休息法 + 学习节奏规划", keywords: "休息、节奏、疲劳" } },
  { level: 11, range: [30, 35],  state: "强烈建议休息",     comment: "身心都有点超负荷，效率不高，停下来放松、恢复精力",
    game:   { name: "【纯放松小游戏】无压力趣味互动 / 情绪小治愈", keywords: "放松、情绪、无压力" },
    course: { name: "【疏导微课】情绪舒缓 + 过度疲劳危害科普", keywords: "情绪、疲劳、舒缓" } },
  { level: 12, range: [25, 30],  state: "急需放松调整",     comment: "压力或疲劳比较重，先舒缓情绪、好好休息，学习稍后再说",
    game:   { name: "【情绪小游戏】心情涂鸦 / 呼吸调节互动", keywords: "情绪、压力、放松" },
    course: { name: "【心理微课】压力疏导 + 积极心态建设", keywords: "压力、情绪、心态" } },
  { level: 13, range: [20, 25],  state: "状态需要调试",     comment: "今天可能太累或情绪不佳，看看综艺解解闷吧",
    game:   { name: "【轻治愈小游戏】轻松趣味互动，无学习任务", keywords: "状态、放松、治愈" },
    course: { name: "【重建微课】如何重新进入学习状态 + 作息调整", keywords: "状态、调整、重建" } },
  { level: 14, range: [10, 20],  state: "低参与状态",       comment: "今天可能是太累了，咱们先放下学习，放松一下吧。",
    game:   { name: "【兴趣激发小游戏】趣味知识闯关 / 简单挑战", keywords: "兴趣、唤醒、低压力" },
    course: { name: "【兴趣微课】如何找到学习动力 + 快速进入状态", keywords: "动力、兴趣、入门" } },
  { level: 15, range: [0,  10],  state: "不宜学习",         comment: "今天可以休息休息，不用紧张，明天太阳会照常升起～",
    game:   { name: "【启动小游戏】超简单趣味专注热身", keywords: "启动、轻松、专注" },
    course: { name: "【启动微课】5 分钟进入学习法 + 小目标设定", keywords: "开始、轻松、习惯" } }
];

function levelOf(score: number): Level {
  return LEVELS.find(l => score >= l.range[0] && score < l.range[1]) || LEVELS[LEVELS.length - 1];
}

/** 高权重维度校准: 等级数字越大状态越差 */
function calibrateLevel(rawLevel: number, dim: DimensionScores, s: MultimodalScores): { level: number; adjustments: string[] } {
  let lvl = rawLevel;
  const adj: string[] = [];
  if (dim.concentration < 60) { lvl = Math.min(15, lvl + 1); adj.push("专注力<60 等级下调1"); }
  if (dim.stress        < 50) { lvl = Math.min(15, lvl + 1); adj.push("抗压力<50 等级下调1"); }
  // 文档中 "学习疲劳度>70 下调1": 注: 我们存的是反向分(高=不疲劳), 所以触发条件是 < 30
  if (s.learning_fatigue < 30) { lvl = Math.min(15, lvl + 1); adj.push("疲劳度高 等级下调1"); }
  if (s.learning_interest > 80) { lvl = Math.max(1, lvl - 1); adj.push("兴趣度>80 等级上调1"); }
  return { level: lvl, adjustments: adj };
}

export type EvaluationResult = {
  scores: MultimodalScores;
  dimensions: DimensionScores;
  composite: number;
  raw_level: number;
  final_level: number;
  state_label: string;
  comment: string;
  recommendation: { game: { name: string; keywords: string }; course: { name: string; keywords: string } };
  adjustments: string[];
};

export function evaluate(scores: MultimodalScores): EvaluationResult {
  const dim = dimensionScores(scores);
  const composite = compositeScore(scores);
  const raw = levelOf(composite);
  const { level: finalLvl, adjustments } = calibrateLevel(raw.level, dim, scores);
  const final = LEVELS.find(l => l.level === finalLvl)!;
  return {
    scores, dimensions: dim, composite,
    raw_level: raw.level, final_level: final.level,
    state_label: final.state, comment: final.comment,
    recommendation: { game: final.game, course: final.course },
    adjustments
  };
}

// ===== 随机生成器 (测试用) =====
type Bias = "uniform" | "high" | "low" | "normal";

function rand(min: number, max: number) { return Math.round(min + Math.random() * (max - min)); }

function biased(b: Bias): number {
  if (b === "high") return rand(70, 95);
  if (b === "low")  return rand(15, 50);
  if (b === "normal") {
    // box-muller 取近似正态, 中心 65, 标准差 15
    const u = Math.random(), v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return Math.max(0, Math.min(100, Math.round(65 + z * 15)));
  }
  return rand(0, 100);
}

export function generateRandomScores(bias: Bias = "normal"): MultimodalScores {
  const out = {} as MultimodalScores;
  for (const k of SCORE_KEYS) out[k] = biased(bias);
  return out;
}

// ===== 对外 JSON (按文档 3.2 字段名) =====
export function toExternalJson(result: EvaluationResult, ids: { user_id?: string; video_id?: string; audio_id?: string; txt_id?: string } = {}) {
  const now = new Date();
  const yyyy = now.getFullYear(), mm = String(now.getMonth() + 1).padStart(2, "0"), dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0"), mi = String(now.getMinutes()).padStart(2, "0"), ss = String(now.getSeconds()).padStart(2, "0");
  return {
    // 一级维度均分
    Concentration_score: result.dimensions.concentration,
    Stress_Response_score: result.dimensions.stress,
    Learning_Status_score: result.dimensions.status,
    // 二/三级指标 (文档示例字段命名风格)
    Concentration_Level_score: result.scores.concentration_level,
    Attention_Duration_score: result.scores.attention_duration,
    Visual_Distraction_score: result.scores.visual_distraction,
    Auditory_Distraction_score: result.scores.auditory_distraction,
    Switching_Efficiency_score: result.scores.switching_efficiency,
    Stress_Speed_score: result.scores.stress_speed,
    Stress_Regulation_score: result.scores.stress_regulation,
    Stress_Tolerance_score: result.scores.stress_tolerance,
    Stress_Difference_score: result.scores.stress_difference,
    Learning_Fatigue_score: result.scores.learning_fatigue,
    Learning_Interest_score: result.scores.learning_interest,
    Status_Stability_score: result.scores.status_stability,
    Emotional_Adaptability_score: result.scores.emotional_adaptability,
    composite_score: result.composite,
    level: result.final_level,
    state_label: result.state_label,
    timestamps: `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`,
    user_id: ids.user_id || "",
    video_id: ids.video_id || "",
    audio_id: ids.audio_id || "",
    txt_id: ids.txt_id || ""
  };
}
