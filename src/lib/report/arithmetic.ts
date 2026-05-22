// 报告算法 — 由旧系统 app\modules\myclass\Arithmetic + functions.php 移植
// 静态文案表见 report-content.json (由 scripts/php_data_to_json.mjs 从 PHP 精确生成)
import content from "./report-content.json";

const C = content as any;

// ---------- functions.php ----------

/** 选项位置计分: A=最高(总数), 依次递减; 越界返回 null */
export function calcOptionScore(answer: string, totalOptions: number): number | null {
  const a = (answer || "").toUpperCase();
  const pos = a.charCodeAt(0) - 65 + 1; // A=1
  if (pos < 1 || pos > totalOptions) return null;
  return totalOptions - (pos - 1);
}

/** 得分百分比 ≥50% 判高(1) 否则低(0) */
export function getPercentResult(total: number, score: number): number {
  if (total <= 0) return 0;
  return (score / total) * 100 >= 50 ? 1 : 0;
}

// ---------- 自陈量表 ----------

/** 自陈结果匹配: [result, proposal, title] */
function selfReportingScale(key: string, type: "高" | "低"): [string, any[], string] {
  // 构建一次索引: name -> level -> {result, proposal, title}
  if (!selfReportIndex) {
    selfReportIndex = {};
    for (const item of C.reportData as any[]) {
      (selfReportIndex[item.name] ??= {})[item.level] = {
        result: item.result ?? "",
        proposal: item.proposal ?? [],
        title: item.title ?? "",
      };
    }
  }
  const hit = selfReportIndex[key]?.[type];
  return hit ? [hit.result, hit.proposal, hit.title] : ["", [], ""];
}
let selfReportIndex: Record<string, Record<string, any>> | null = null;

export type SelfProfile = {
  group: number; total_points: number; level: string; highCount: number;
  details: Record<string, { total: number; correct: number; minCorrect: number; isHigh: number; result: string; title: string; proposal: any[] }>;
};

/** 自陈量表: ranges[key] = [总题数, 答对数]; 答对≥50%判高 */
export function evaluateStudyProfile(ranges: Record<string, [number, number]>): SelfProfile {
  const details: SelfProfile["details"] = {};
  let highCount = 0, total_points = 0;
  for (const key of Object.keys(ranges)) {
    const [total, correct] = ranges[key];
    const minCorrect = Math.ceil(total * 0.5);
    const isHigh = correct >= minCorrect;
    let result = "", proposal: any[] = [], title = "";
    if (isHigh) { total_points++; [result, proposal, title] = selfReportingScale(key, "高"); }
    else { [result, proposal, title] = selfReportingScale(key, "低"); }
    details[key] = { total, correct, minCorrect, isHigh: isHigh ? 1 : 0, result, title, proposal };
    if (isHigh) highCount++;
  }
  const levelMap: Record<number, string> = { 5: "五项为高分", 4: "四项为高分", 3: "三项为高分", 2: "两项为高分", 1: "一项为高分", 0: "0项为高分" };
  return { group: highCount >= 3 ? 1 : 0, total_points, level: levelMap[highCount] ?? "", highCount, details };
}

// ---------- 多元性向 ----------

/** PR 对照表得分 */
export function getPrContrast(name: string, number: number): number {
  if (!name || number <= 0) return 0;
  const table = C.arithmetic.getPrContrast[name];
  return table?.[number - 1] ?? 0;
}

/** 多元子项目 → 大类(名)及高低 */
function getCalcScoreByResultsName(name: string, number: number): { name?: string; result: number } {
  if (!pluralismIndex) {
    pluralismIndex = {};
    for (const item of C.pluralism as any[]) pluralismIndex[item.subitems] = { name: item.name, number: item.number };
  }
  const p = pluralismIndex[name];
  if (!p) return { result: 0 } as any;
  return { name: p.name, result: number >= p.number ? 1 : 0 };
}
let pluralismIndex: Record<string, { name: string; number: number }> | null = null;

/** 多元性向某项目得分: results=每题对错[1/0], 经 PR 对照与门槛判高低 */
export function calcScoreByResults(results: number[], name = ""): { number: number; name: string; result: number } {
  const total = results.length;
  if (total === 0) {
    const r = getCalcScoreByResultsName(name, 0);
    return { number: 0, name: r.name ?? "", result: r.result };
  }
  let correct = 0;
  for (const v of results) if (Number(v) === 1) correct++;
  const number = getPrContrast(name, correct);
  const r = getCalcScoreByResultsName(name, number);
  return { number, name: r.name ?? "", result: r.result };
}

/** 多元结果解读: arr = {逻辑思维:1, 阅读能力:0, 专注力:1} */
export function multielementResult(arr: Record<string, number>): { value: number; title: string; content: string }[] {
  const data = C.arithmetic.multielementResult as Record<string, string>;
  return Object.keys(arr).map(key => ({ value: arr[key], title: key, content: data[key + arr[key]] ?? "" }));
}

// ---------- 八维学格 ----------

export function getOctupleName(multimode: number, multiple: number, report: number): { type: string; str: string } {
  const key = `${multimode ? 1 : 0}${multiple ? 1 : 0}${report ? 1 : 0}`;
  const map: Record<string, string> = {
    "011": "波动焦虑型", "001": "死磕傻学型", "000": "摆烂到底型", "111": "稳定卓越型",
    "101": "策略僵化型", "100": "佛系躺平型", "110": "动力缺失型", "010": "潜力待挖型",
  };
  const type = map[key] ?? "未知类型";
  return { type, str: (C.arithmetic.getUserTypeName[type] ?? "") as string };
}

export function getXueGeName(name: string): { title: string; describe: string } {
  return C.arithmetic.getXueGeName[name] ?? { title: "无", describe: "无" };
}
export function getXueGeUnscramble(value: string): { content: string; suggest: string } {
  return C.arithmetic.getXueGeUnscramble[value] ?? { content: "", suggest: "" };
}
/** key = 兴趣类型 + '+' + 学格类型, 如 '艺术型+波动焦虑型' */
export function interestContentText(careerName: string, xuegeType: string): { name: string; content: string } {
  return (C.interestContent[`${careerName}+${xuegeType}`]) ?? { name: "无", content: "无" };
}

// ---------- 兴趣 RIASEC ----------

const RIASEC_CODES: Record<string, number[]> = {
  R: [1, 11, 15, 20, 25, 35, 39, 44, 52, 59, 61, 69, 75, 84, 87, 92, 98, 106, 112, 118, 124, 128, 133, 144, 150, 153, 158, 165, 169, 177],
  I: [5, 9, 14, 24, 28, 31, 37, 46, 54, 60, 65, 71, 73, 82, 89, 96, 99, 104, 109, 120, 126, 130, 136, 141, 145, 154, 162, 167, 173, 176],
  A: [2, 10, 13, 22, 26, 36, 42, 47, 49, 56, 66, 70, 76, 80, 85, 95, 97, 108, 111, 119, 121, 132, 134, 142, 146, 155, 157, 168, 171, 179],
  S: [4, 7, 17, 21, 27, 32, 40, 45, 50, 57, 62, 67, 77, 81, 88, 93, 100, 103, 113, 117, 122, 131, 137, 139, 149, 152, 159, 166, 174, 180],
  E: [3, 12, 16, 19, 29, 33, 38, 48, 51, 55, 64, 72, 78, 83, 86, 91, 101, 105, 114, 116, 125, 127, 135, 140, 148, 156, 161, 163, 172, 175],
  C: [6, 8, 18, 23, 30, 34, 41, 43, 53, 58, 63, 68, 74, 79, 90, 94, 102, 107, 110, 115, 123, 129, 138, 143, 147, 151, 160, 164, 170, 178],
};
const CAREER_MAP: Record<string, string> = { R: "实用型", I: "研究型", A: "艺术型", S: "社会型", E: "企业型", C: "事务型" };

export function interestUserName(name: string): { name: string; img: number } {
  return C.arithmetic.interestUserName[name] ?? { name: "", img: 0 };
}

/** 小三码匹配推荐专业 (旧表为部分数据) */
function matchInterestMajorsByTop3(top3: string): { major: string; category: string; match_code: string; stars: number }[] {
  const t = (top3 || "").toUpperCase().trim();
  if (t.length < 2) return [];
  const letters = t.split("");
  const pairs = new Set<string>();
  for (let i = 0; i < letters.length; i++)
    for (let j = 0; j < letters.length; j++)
      if (i !== j) pairs.add(letters[i] + letters[j]);

  const table: { codes: string[]; major: string; category: string }[] = [
    { codes: ["SI", "SA", "SE"], major: "宗教学", category: "哲学" },
    { codes: ["AS", "SA", "AI"], major: "哲学", category: "哲学" },
    { codes: ["ES", "EC", "CE", "CS"], major: "會計", category: "经济学" },
    { codes: ["ES", "EC", "CE", "CS"], major: "金融学", category: "经济学" },
    { codes: ["ES", "EC", "EA", "CS"], major: "经济与贸易类", category: "经济学" },
    { codes: ["ES", "EC", "CE", "CS"], major: "财政学类", category: "经济学" },
    { codes: ["ES", "EC", "CE", "CS"], major: "保险学", category: "经济学" },
    { codes: ["ES", "EC", "CE", "EI"], major: "经济学", category: "经济学" },
    { codes: ["SI", "SA", "SE"], major: "社会学", category: "法学" },
    { codes: ["SI", "SE", "SA", "ES"], major: "社会工作", category: "法学" },
    { codes: ["SI", "SA", "SE"], major: "民族学", category: "法学" },
    { codes: ["SI", "SE", "SA", "AS"], major: "家政学", category: "法学" },
    { codes: ["SI", "SA", "SE", "ES"], major: "犯罪学", category: "法学" },
    { codes: ["ES", "EA", "EI", "SE"], major: "法学类", category: "法学" },
    { codes: ["ES", "EA", "EI", "SA"], major: "政治学与行政学", category: "法学" },
    { codes: ["ES", "EA", "EI", "SA"], major: "马克思主义理论类", category: "法学" },
    { codes: ["IR", "RI", "IS", "SI"], major: "教育技术学", category: "教育学" },
    { codes: ["SE", "IS", "SR"], major: "运动人体科学", category: "教育学" },
    { codes: ["SI", "SA", "SE", "AS"], major: "教育学", category: "教育学" },
    { codes: ["SA", "SE"], major: "特殊教育", category: "教育学" },
    { codes: ["SE", "SA", "AS"], major: "学前教育", category: "教育学" },
    { codes: ["SE", "SA", "AS", "SR"], major: "体育教育", category: "教育学" },
  ];

  const results: { major: string; category: string; match_code: string; stars: number }[] = [];
  for (const row of table) {
    let bestIndex: number | null = null, bestCode: string | null = null;
    row.codes.forEach((code, idx) => {
      if (code && pairs.has(code) && (bestIndex === null || idx < bestIndex)) { bestIndex = idx; bestCode = code; }
    });
    if (bestIndex !== null) {
      const stars = bestIndex === 0 ? 3 : bestIndex === 1 ? 2 : 1;
      results.push({ major: row.major, category: row.category, match_code: bestCode!, stars });
    }
  }
  results.sort((a, b) => a.stars === b.stars ? a.major.localeCompare(b.major) : b.stars - a.stars);
  return results;
}

export type InterestResult = {
  career_name: string; scores: Record<string, number>;
  scores_arr: Record<string, { title: string; value: number }>;
  top3: string; top3_arr: { title: string; value: string }[];
  diff_value: number; diff_level: string; self_introduce: string;
  career: { code: string; stars: number; majors: string[] }[];
  harmony_value: number; harmony_level: string;
  majors_data: { major: string; category: string; match_code: string; stars: number }[];
};

/** 兴趣算法: answers 按题序 1..N 索引(值=单题计分) */
export function getInterestResult(answers: Record<number, number>): InterestResult {
  const scores: Record<string, number> = {};
  const scores_arr: Record<string, { title: string; value: number }> = {};
  for (const code of Object.keys(RIASEC_CODES)) {
    let sum = 0;
    for (const q of RIASEC_CODES[code]) sum += answers[q] ?? 0;
    scores[code] = Math.round((sum * 25 / 30) * 100) / 100;
    scores_arr[code] = { title: CAREER_MAP[code] ?? "", value: scores[code] };
  }
  const sortedCodes = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
  const top3codes = sortedCodes.slice(0, 3);
  const topValues = top3codes.map(c => scores[c]);
  const career_name = CAREER_MAP[top3codes[0]] ?? "";

  const [X1, X2, X3] = [topValues[0] ?? 0, topValues[1] ?? 0, topValues[2] ?? 0];
  const D = (X1 - (X2 + X3) / 2) / 2;
  const diffLevel = D > 0.33 ? "高" : D < 0.18 ? "低" : "中";

  const mapSelf = ["R", "I", "A", "S", "E", "C"];
  let self = "";
  for (let i = 181; i <= 183; i++) if (answers[i] != null) self += mapSelf[(answers[i] ?? 1) - 1] ?? "";

  const recommend: { code: string; stars: number; majors: string[] }[] = [];
  const top3_arr: { title: string; value: string }[] = [];
  top3codes.forEach((code, k) => {
    top3_arr.push({ title: CAREER_MAP[code] ?? "", value: code });
    recommend.push({ code, stars: k === 0 ? 3 : k === 1 ? 2 : 1, majors: [CAREER_MAP[code] ?? ""] });
  });
  const top3 = top3codes.join("");

  // 谐和度: self 向量与兴趣分向量余弦相似度
  const selfVector: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const code of self.split("")) if (selfVector[code] != null) selfVector[code] += 1;
  let dot = 0, magA = 0, magB = 0;
  for (const c of ["R", "I", "A", "S", "E", "C"]) {
    dot += selfVector[c] * scores[c]; magA += selfVector[c] ** 2; magB += scores[c] ** 2;
  }
  const harmony = magA * magB === 0 ? 0 : dot / (Math.sqrt(magA) * Math.sqrt(magB));
  const harmonyLevel = harmony >= 0.85 ? "高" : harmony >= 0.65 ? "中上" : harmony >= 0.45 ? "普通" : "低";

  return {
    career_name, scores, scores_arr, top3, top3_arr,
    diff_value: Math.round(D * 1000) / 1000, diff_level: diffLevel, self_introduce: self,
    career: recommend, harmony_value: Math.round(harmony * 1000) / 1000, harmony_level: harmonyLevel,
    majors_data: matchInterestMajorsByTop3(top3),
  };
}

// ---------- 多模态 ----------

/** 多模态花瓣分: 2/1/0 */
export function calcMultiModalPetalScore(state: number, trait: number, stress: number): number {
  const stateHigh = state >= 57, stateLowMid = state < 57;
  const traitHigh = trait >= 57, traitLowMid = trait < 52;
  const stressLowMid = stress >= 14 && stress <= 42;
  const stressHigh = stress >= 43 && stress <= 70;
  if (stateLowMid && traitLowMid && stressLowMid) return 2;
  if (stressHigh && stateLowMid && traitLowMid) return 1;
  if (stressLowMid && (stateHigh !== traitHigh)) return 1;
  if (stateHigh && traitHigh && (stressLowMid || stressHigh)) return 0;
  if (stressHigh && (stateHigh !== traitHigh)) return 0;
  return 0;
}

/** 状态/特质/学习压力 三项的高低解读 */
export function calcAllLevels(stateScore: number, traitScore: number, studyScore: number) {
  const stateLevel = stateScore < 33 ? 2 : stateScore < 57 ? 1 : 0;
  const traitLevel = traitScore < 34 ? 2 : traitScore < 52 ? 1 : 0;
  const studyLevel = studyScore <= 28 ? 2 : studyScore <= 42 ? 1 : 0;
  return {
    state: C.arithmetic.stateAnxietyResult[String(stateLevel)] ?? null,
    trait: C.arithmetic.traitAnxietyResult[String(traitLevel)] ?? null,
    study: C.arithmetic.studyScoreResult[String(studyLevel)] ?? null,
  };
}
