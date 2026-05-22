// 报告生成 — 由旧系统 ReportlogFn::reportShow + submit 计分逻辑移植
import {
  calcOptionScore, getPercentResult, calcScoreByResults, multielementResult,
  getOctupleName, getXueGeName, getXueGeUnscramble, interestContentText,
  getInterestResult, interestUserName, calcMultiModalPetalScore, calcAllLevels,
  evaluateStudyProfile,
} from "./arithmetic";

// 维度/题型 中文 → 旧 type number
export const DIM_NUM: Record<string, number> = { "多元性向量表": 0, "自陈量表": 1, "兴趣量表": 2, "多模态": 3 };
export const QTYPE_NUM: Record<string, number> = { "单选题": 0, "判断题": 1, "语音题": 2 };

export type AnxietyExtend = { status_anxiety_score: number; trait_anxiety_score: number; learning_stress_score: number };

export type ReportItem = {
  dimension_type: number;          // 0多元 1自陈 2兴趣 3多模态
  project: string;
  result: number;                  // 计分结果
  extend_json?: AnxietyExtend | null; // 多模态焦虑分
};

type QuestionForScore = {
  id: string;
  dimension: string;
  qtype: string;
  answer?: string | null;          // 正确答案
  project_name?: string | null;
  options?: { value: string }[] | null;
};

/**
 * 单题计分 (旧 submit 逻辑): 返回 result
 *   判断题: 对=1 错=0
 *   单选题: 兴趣维度=选项位置计分; 其余 对=1 错=0
 *   语音题: 不在此计分(由 extend_json)
 */
export function scoreAnswer(q: QuestionForScore, userAnswer: string | null): number {
  const dim = DIM_NUM[q.dimension] ?? 0;
  const qt = QTYPE_NUM[q.qtype] ?? 0;
  if (qt === 1) return q.answer != null && q.answer === userAnswer ? 1 : 0;
  if (qt === 0) {
    if (dim === 2) return calcOptionScore(String(userAnswer || ""), (q.options || []).length) ?? 0;
    return q.answer != null && q.answer === userAnswer ? 1 : 0;
  }
  return 0;
}

/** 把作答原始数据转成报告项 (按题序) */
export function buildReportItems(
  questions: QuestionForScore[],
  answers: Record<string, string | null>,
  extendMap: Record<string, AnxietyExtend | null> = {}
): ReportItem[] {
  const items: ReportItem[] = [];
  for (const q of questions) {
    if (!(q.id in answers)) continue;
    items.push({
      dimension_type: DIM_NUM[q.dimension] ?? 0,
      project: q.project_name || "",
      result: scoreAnswer(q, answers[q.id]),
      extend_json: extendMap[q.id] ?? null,
    });
  }
  return items;
}

export type ReportData = ReturnType<typeof generateReport>;

/** reportShow 移植: 报告项 → value1~value10 */
export function generateReport(items: ReportItem[], meta: { name?: string; code?: string; dates?: string } = {}) {
  // ---- 分维度归集 ----
  const selfRanges: Record<string, [number, number]> = {};   // 自陈
  const multiRanges: Record<string, number[]> = {};          // 多元
  const interestData: Record<number, number> = {};           // 兴趣(按序)
  let interestNo = 1;
  const multimoding = { status_anxiety_score: 0, trait_anxiety_score: 0, learning_stress_score: 0, result: 0 };

  for (const item of items) {
    if (item.dimension_type === 0) {
      (multiRanges[item.project] ??= []).push(Number(item.result));
    } else if (item.dimension_type === 1) {
      if (selfRanges[item.project]) { selfRanges[item.project][0]++; selfRanges[item.project][1] += Number(item.result); }
      else selfRanges[item.project] = [1, Number(item.result)];
    } else if (item.dimension_type === 2) {
      interestData[interestNo++] = Number(item.result);
    } else if (item.dimension_type === 3 && item.extend_json) {
      multimoding.status_anxiety_score = item.extend_json.status_anxiety_score ?? 0;
      multimoding.trait_anxiety_score = item.extend_json.trait_anxiety_score ?? 0;
      multimoding.learning_stress_score = item.extend_json.learning_stress_score ?? 0;
      multimoding.result = getPercentResult(3, multimoding.status_anxiety_score + multimoding.trait_anxiety_score + multimoding.learning_stress_score);
    }
  }

  // ---- 多元性 ----
  const multivariantCake: Record<string, number> = {};
  const scoringArr: Record<string, { point: number; total: number }> = {};
  const projectArr: { name: string; value: number }[] = [];
  let multipleNumber = 0;
  for (const key of Object.keys(multiRanges)) {
    const calc = calcScoreByResults(multiRanges[key], key);
    multipleNumber += calc.result ?? 0;
    if (scoringArr[calc.name]) { multivariantCake[calc.name] += calc.result; scoringArr[calc.name].point += calc.number; scoringArr[calc.name].total++; }
    else { multivariantCake[calc.name] = calc.result; scoringArr[calc.name] = { point: calc.number, total: 1 }; }
    projectArr.push({ name: key, value: calc.number });
  }
  const multipleResult = getPercentResult(Object.keys(multiRanges).length, multipleNumber);
  const multielement: Record<string, number> = {};
  for (const k of Object.keys(scoringArr)) multielement[k] = getPercentResult(scoringArr[k].total, scoringArr[k].point);

  // ---- 多模态 ----
  const multimodingCake = calcMultiModalPetalScore(multimoding.status_anxiety_score, multimoding.trait_anxiety_score, multimoding.learning_stress_score);
  const multimodingLevels = calcAllLevels(multimoding.status_anxiety_score, multimoding.trait_anxiety_score, multimoding.learning_stress_score);

  // ---- 兴趣 ----
  const interestResult = getInterestResult(interestData);

  // ---- 自陈 ----
  const selfProfile = evaluateStudyProfile(selfRanges);
  const reportCake: Record<string, number> = {};
  const reportResultArr: { name: string; value: string }[] = [];
  const reportProposalArr: { name: string; title: string; value: any[] }[] = [];
  for (const k of Object.keys(selfProfile.details)) {
    const item = selfProfile.details[k];
    reportCake[k] = (reportCake[k] ?? 0) + item.isHigh;
    reportResultArr.push({ name: k, value: item.result });
    reportProposalArr.push({ name: k, title: item.title, value: item.proposal });
  }
  const reportResult = selfProfile.group;

  // ---- 合成 ----
  const octuple = getOctupleName(multimoding.result, multipleResult, reportResult);
  const xuegeInfo = getXueGeName(octuple.type);
  const userName = interestUserName(interestResult.career_name);
  const value1Content = interestContentText(interestResult.career_name, octuple.type);
  const xuegeUnscramble = getXueGeUnscramble(octuple.type);

  // value2 饼状图: 合并三类后映射档位
  const cakeMerged: Record<string, number> = { "抗压能力": multimodingCake, ...multivariantCake, ...reportCake };
  const cakeLevelMap: Record<number, number> = { 0: 10, 1: 40, 2: 70, 3: 100 };
  const value2: Record<string, number> = {};
  for (const k of Object.keys(cakeMerged)) value2[k] = cakeLevelMap[cakeMerged[k]] ?? 10;

  const scoresCake = Object.keys(interestResult.scores_arr).map(k => ({
    name: k, title: interestResult.scores_arr[k].title, value: interestResult.scores_arr[k].value,
  }));
  const interestArr = interestResult.career.map(it => `代码 ${it.code}（${"★".repeat(it.stars)}）：${it.majors.join(" / ")}`);
  const majorArr = interestResult.majors_data.length
    ? interestResult.majors_data.map((row, i) => `${i + 1}. ${row.major}  [${row.category}]  (${row.match_code} / ${"★".repeat(row.stars)})`)
    : ["暂无匹配专业"];

  return {
    name: meta.name ?? "", code: meta.code ?? "", dates: meta.dates ?? "",
    value1: { name: userName.name, img: userName.img, title: value1Content.name, describe: xuegeInfo.describe, content: value1Content.content },
    value2,
    value3: { title: octuple.type, str: octuple.str, content: xuegeUnscramble.content, suggest: xuegeUnscramble.suggest },
    value4: { status_anxiety: multimodingLevels.state, trait_anxiety: multimodingLevels.trait, study_anxiety: multimodingLevels.study },
    value5: [
      { title: "状态焦虑", value: multimoding.status_anxiety_score },
      { title: "特质焦虑", value: multimoding.trait_anxiety_score },
      { title: "感知压力", value: multimoding.learning_stress_score },
    ],
    value6: multielementResult(multielement),
    value7: projectArr,
    value8: {
      scores_cake: scoresCake,
      career_name: interestResult.career_name,
      top3: interestResult.top3,
      top3_arr: interestResult.top3_arr,
      distinguish: `区分性 D 值：${interestResult.diff_value}  （${interestResult.diff_level}）`,
      diff_value: interestResult.diff_value,
      diff_level: interestResult.diff_level,
      harmony_value: interestResult.harmony_value,
      norm_level: interestResult.harmony_level,
      self_introduce: interestResult.self_introduce,
      interest_arr: interestArr,
      major_arr: majorArr,
    },
    value9: reportResultArr,
    value10: reportProposalArr,
  };
}
