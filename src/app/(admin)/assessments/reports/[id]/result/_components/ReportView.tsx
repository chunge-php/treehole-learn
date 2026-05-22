"use client";
import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EChart } from "@/components/admin/EChart";
import { ArrowLeft, Download, Loader2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

// 测量阶段图表渲染为占位 div, 不初始化 echarts (避免双重渲染拖慢)
const MeasuringCtx = createContext(false);
function ChartBlock({ height, option }: { height: number; option: any }) {
  const measuring = useContext(MeasuringCtx);
  if (measuring) return <div style={{ height }} />;
  return <EChart option={option} style={{ height, width: "100%" }} />;
}

// A4 @96dpi
const PAGE_W = 794;
const PAGE_H = 1123;
const PAD = 44;
const HEADER_H = 54;
const FOOTER_H = 30;
const CONTENT_W = PAGE_W - PAD * 2;
const CONTENT_H = PAGE_H - PAD * 2 - HEADER_H - FOOTER_H;

const ORANGE = "#E98A3C";
const RIASEC_COLOR: Record<string, string> = { R: "#4CA95E", I: "#02D1D4", A: "#2580CA", S: "#BB1228", E: "#AF8E40", C: "#9D6CDB" };
const RIASEC_GRAD: Record<string, [string, string]> = { R: ["#4CA95E", "#B7E9CF"], I: ["#02D1D4", "#A3EAF8"], A: ["#2580CA", "#ADD6FC"], S: ["#BB1228", "#DBBDD0"], E: ["#AF8E40", "#DADBCC"], C: ["#9D6CDB", "#CFC8FB"] };
const ROSE_PALETTE = ["#57DCC1", "#E04372", "#F6B901", "#7A4BFE", "#2E9AEB", "#7DD900", "#455DEF", "#CB40E4", "#FFEB3B"];
const ANXIETY_GRAD: [string, string][] = [["#FBB45A", "#FCE3BE"], ["#F29CAE", "#FBDEE4"], ["#B3A2E6", "#E4DDF6"]];

const OCTUPLE_TABLE = [
  { label: "波动焦虑型", value: "一到考试就考砸，焦虑值直接拉满", a: "l", b: "h", c: "h" },
  { label: "死磕傻学型", value: "蛮干，埋头硬冲到底型", a: "l", b: "l", c: "h" },
  { label: "摆烂到底型", value: "躺平到完全躺平，毫无波澜", a: "l", b: "l", c: "l" },
  { label: "稳定卓越型", value: "全能无短板，八边形学霸天花板级", a: "h", b: "h", c: "h" },
  { label: "策略僵化型", value: "方法老套到极致，低效到没救", a: "h", b: "l", c: "h" },
  { label: "佛系躺平型", value: "彻底摆烂，自我放弃到极致", a: "h", b: "l", c: "l" },
  { label: "动力缺失型", value: "内驱力彻底告急，毫无冲劲", a: "h", b: "h", c: "l" },
  { label: "潜力待挖型", value: "黑马属性拉满，潜力大到爆炸", a: "l", b: "h", c: "l" },
];

const INTEREST_TYPE_TABLE = [
  { label: "实用型", value: "Realistic", a: "喜欢在讲求实际、技术规范下动手做明确的工作，对机械、仪器、工具、动能设备有兴趣。生活喜以实用为主，眼前的事胜于对未来的想象。情绪稳定，不善与人有深入的接触。", b: "适合从事机械、电子、土木建筑、生物科技等工作。", c: "情绪安稳、内向不善表达，严谨按部就班，谦虚有恒。" },
  { label: "研究型", value: "Investigative", a: "此类型的人喜欢用理性思考分析，善于观察判断与推理，喜欢运用符号、概念、公式来面对工作以解决问题。", b: "喜欢从事物理、化学、生物、数学、医药等研发工作，有科学及数理的能力，不好领导与社交。", c: "重视方法分析、独立、批判、理性。" },
  { label: "艺术型", value: "Artistic", a: "此型的人善于创新、设计与美学的表达，喜欢用文字、动作、声音、色彩、音乐、舞蹈或戏剧来表达美的事物，语言方面的能力高于数理。", b: "喜欢成为设计师、作家、画家、媒体人、音乐家、歌手与表演工作者。", c: "感性、有理想、不从众、有创意、善于表达、冲动。" },
  { label: "社会型", value: "Social", a: "此类型的人善于与人相处，关怀与帮助他人的身心需求，希望了解、分析、鼓励、教导别人成为正向乐群的人。", b: "喜欢从事助人的工作，如教师、咨询师、社工师、医护人员、活动辅导员。", c: "温暖、亲切、仁慈、合作、同理、宽容、有责任、助人。" },
  { label: "企业型", value: "Enterprising", a: "此类型的人喜欢运用规则能力，领导力和口语表达，组织安排及统筹管理人员，具有好的沟通能力，但较不在乎细部研发。", b: "喜欢销售、督导、策画、倡导等活动，有兴趣从事营销、采购、产销链、律师法官及公务行政等工作。", c: "精力充沛、动作快、冒险、外向、有企图心、社交、热情、决策快速。" },
  { label: "事务型", value: "Conventional", a: "此型的人注意细节及事务技能，擅长纪录、建文件、编辑文件或核算精细的数字。", b: "善于执行各项事务，整洁有序、服从规范；喜欢会计、行政、数据处理方面工作，如银行人员、金融分析师、税务专家、运输物流或会计出纳等。", c: "守本分、顺从、坚毅、节俭、有条理、谨慎、实际。" },
];

const INTEREST_FIXED = [
  { t: "自我认知与心态：", v: "对自身学习能力的信心不足，尤其是在学习结果不理想时，容易否定自己，选择逃避而非主动解决问题；面对考试时，即使做好准备也会感到紧张，缺乏稳定的应试心态。" },
  { t: "学习习惯与方法：", v: "在时间安排上缺乏规划，容易拖延重要学习任务，且学习时易受手机等外界因素干扰；没有形成系统的学习流程，比如课前预习、课后复习、错题整理等环节落实不到位，影响学习效果。" },
  { t: "目标与动力：", v: "没有清晰的学习目标，不知道如何将长期目标拆解为可执行的短期任务，也不会定期检查学习进度；学习动力依赖结果反馈，一旦成绩不理想，就容易失去学习热情，内在学习动力需要进一步强化。" },
  { t: "支持感知：", v: "若在遇到学习压力或情绪问题时，能感受到家人的理解和安慰，而非仅关注成绩，会更有利于缓解焦虑；若家人过度关注分数、忽视情绪需求，则可能加重学习压力。" },
];

function rankData(scoresCake: any[]) {
  return scoresCake
    .map((it, i) => ({ ...it, _i: i }))
    .sort((a, b) => (b.value !== a.value ? b.value - a.value : a._i - b._i))
    .map((it, rank) => ({ name: it.name, title: it.title, value: it.value, rank: rank + 1 }))
    .sort((a, b) => scoresCake.findIndex(x => x.name === a.name) - scoresCake.findIndex(x => x.name === b.name));
}

const SecTitle = ({ n, title }: { n: string; title: string }) => (
  <h2 className="mb-2 mt-1 text-lg font-bold text-primary">
    <span className="rounded bg-primary/15 px-2 py-1 box-decoration-clone">{n}、{title}</span>
  </h2>
);
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="font-bold text-slate-800">{children}</h3>;
const Em = ({ children }: { children: React.ReactNode }) => <span className="font-semibold text-primary">{children}</span>;
const P = ({ children }: { children: React.ReactNode }) => <p className="leading-relaxed text-slate-600">{children}</p>;

export function ReportView({ report, sessionId, mode = "admin" }: { report: any; sessionId: string; mode?: "admin" | "public" }) {
  const [downloading, setDownloading] = useState(false);

  const value4 = report.value4 || {};
  const value5: any[] = report.value5 || [];
  const value6: any[] = report.value6 || [];
  const value7: any[] = report.value7 || [];
  const value8 = report.value8 || {};
  const value9: any[] = report.value9 || [];
  const pieData = useMemo(() => Object.entries(report.value2 || {}).map(([name, value]) => ({ name, value })), [report]);
  const data1 = (value8.top3_arr || []).map((it: any) => ({ name: it.title, value: it.value, color: RIASEC_COLOR[it.value] }));
  const scoresCake: any[] = value8.scores_cake || [];
  const barY = useMemo(() => rankData(scoresCake), [report]);
  const radarData = scoresCake.map(s => s.value);
  const radarColor = "#02D1D4";
  const data2 = [
    { title: value4.status_anxiety?.title, value: value4.status_anxiety?.proposal || [] },
    { title: value4.trait_anxiety?.title, value: value4.trait_anxiety?.proposal || [] },
    { title: value4.study_anxiety?.title, value: value4.study_anxiety?.proposal || [] },
  ];
  const { data3, data4 } = useMemo(() => {
    const d3: any[] = []; const sug: any[] = [];
    (report.value10 || []).forEach((item: any) => {
      const s = JSON.stringify(item.value || []);
      (s.includes("学生建议") || s.includes("家长建议") ? sug : d3).push(item);
    });
    const student: any[] = []; const parents: any[] = [];
    sug.forEach((item: any) => (item.value || []).forEach((c: any) => {
      if (c?.tops?.includes("学生建议")) student.push(c);
      else if (c?.tops?.includes("家长建议")) parents.push(c);
    }));
    return { data3: d3, data4: { student, parents } };
  }, [report]);

  // ——— echarts ———
  const grad = (from: string, to: string) => ({ type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: from }, { offset: 1, color: to }] });
  const pieOption = {
    legend: { orient: "vertical", right: 0, top: "center", itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 11 } },
    tooltip: { trigger: "item" },
    series: [{ type: "pie", radius: [34, 96], center: ["34%", "50%"], roseType: "area", itemStyle: { borderRadius: 2 }, data: pieData, color: ROSE_PALETTE, label: { fontSize: 10, color: "#666" }, labelLine: { length: 8, length2: 8 } }],
  };
  const barOption = {
    grid: { top: 30, left: 36, right: 16, bottom: 24 },
    xAxis: { type: "category", data: value5.map(v => v.title), axisLabel: { color: "#999" }, axisLine: { lineStyle: { color: "#ECECEC" } }, axisTick: { show: false } },
    yAxis: { type: "value", axisLabel: { color: "#999" }, splitLine: { lineStyle: { color: "#ECECEC" } } },
    tooltip: { trigger: "axis" },
    series: [{ type: "bar", barWidth: "40%", data: value5.map((v, i) => ({ value: v.value, itemStyle: { borderRadius: [4, 4, 0, 0], color: grad(ANXIETY_GRAD[i % 3][0], ANXIETY_GRAD[i % 3][1]) } })), label: { show: true, position: "top", color: "#2580CA", fontWeight: 600 } }],
  };
  const barXOption = {
    grid: { top: 8, left: 96, right: 40, bottom: 8 },
    xAxis: { type: "value", max: 100, splitLine: { show: false }, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: "category", data: value7.map(v => v.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#666", fontSize: 12 } },
    series: [{ type: "bar", data: value7.map(v => v.value), barWidth: 12, itemStyle: { color: "#2580CA", borderRadius: 2 }, label: { show: true, position: "right", color: "#2580CA", fontWeight: 600 } }],
  };
  const radarOption = {
    tooltip: {},
    radar: { indicator: [{ name: "实际", max: 100 }, { name: "研究", max: 100 }, { name: "艺术", max: 100 }, { name: "社会", max: 100 }, { name: "企业", max: 100 }, { name: "事务", max: 100 }], radius: 66, center: ["50%", "54%"], axisName: { color: "#888", fontSize: 11 }, splitNumber: 4 },
    series: [{ type: "radar", data: [{ value: radarData, areaStyle: { color: radarColor + "55" }, lineStyle: { color: radarColor }, itemStyle: { color: radarColor }, label: { show: true, color: "#666", fontSize: 10 } }] }],
  };
  const barYOption = {
    grid: { top: 26, left: 32, right: 8, bottom: 6, containLabel: true },
    xAxis: { type: "category", data: barY.map(it => it.title), axisLabel: { show: false }, axisTick: { show: false }, axisLine: { lineStyle: { color: "#ECECEC" } } },
    yAxis: { type: "value", min: 0, max: 100, axisLabel: { color: "#999" }, splitLine: { lineStyle: { color: "#ECECEC" } } },
    tooltip: { trigger: "axis" },
    series: [{ type: "bar", barWidth: "50%", data: barY.map(it => ({ value: it.value, itemStyle: { borderRadius: [4, 4, 0, 0], color: grad(RIASEC_GRAD[it.name][0], RIASEC_GRAD[it.name][1]) } })), label: { show: true, position: "top", color: "#2580CA", fontSize: 11, fontWeight: 600 } }],
  };

  // ——— 内容块 ———
  const blocks: React.ReactNode[] = [];
  const push = (n: React.ReactNode) => blocks.push(n);

  push(<h1 className="text-center text-2xl font-bold text-slate-800">《个性化学习与发展评估报告》</h1>);
  push(<SecTitle n="一" title="通用导读" />);
  push(<H3>通用导读</H3>);
  push(<P>本报告基于多模态测评记录、多元性向潜能发展测评、兴趣测评及主观自陈量表四份测评，从抗压能力、自信心等 9 个维度，全面评估学生学习状态与发展潜力。报告将明确其学习类型，解读测评结果，并提供针对性发展建议，助力优化学习策略、改善学习心态。</P>);
  push(<H3>学习发展综合数字画像</H3>);
  push(
    <div className="flex items-start gap-4 rounded-lg bg-slate-50 p-4">
      <div className="flex-1">
        <div className="font-bold text-primary">{report.value1?.title || ""}</div>
        <p className="mt-1 leading-relaxed text-slate-600">{report.value1?.content || ""}</p>
      </div>
      {report.value1?.img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/report/i${report.value1.img}.png`} alt={report.value1?.name || ""} className="h-40 w-32 shrink-0 rounded border object-cover" />
      ) : null}
    </div>
  );
  push(<H3>各维度数据展示</H3>);
  push(<ChartBlock height={260} option={pieOption} />);

  push(<SecTitle n="二" title="综合结论与类型界定" />);
  push(
    <div className="flex items-center gap-3 py-1">
      <span className="text-slate-600">经过测评您在八维学格类型中属于：</span>
      <span className="rounded px-2 text-2xl font-extrabold" style={{ color: ORANGE, background: ORANGE + "1f" }}>{report.value3?.title || ""}</span>
    </div>
  );
  push(
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="bg-slate-100 text-slate-700">
          <th className="p-2 text-left">八维学格</th>
          <th className="p-2 text-left" colSpan={3}>组合规则 <span className="font-normal text-muted-foreground">（l-表示低 &nbsp; h-表示高）</span></th>
        </tr>
        <tr className="text-[11px] text-muted-foreground">
          <td className="p-1"></td>
          <td className="p-1 text-center">多模态<br />Eh/El</td>
          <td className="p-1 text-center">多元性向R<br />Rh/Rl</td>
          <td className="p-1 text-center">自陈量表S<br />Sh/Sl</td>
        </tr>
      </thead>
      <tbody>
        {OCTUPLE_TABLE.map(row => {
          const cur = row.label === report.value3?.title;
          return (
            <tr key={row.label} className={"border-t " + (cur ? "bg-primary/10" : "")}>
              <td className="p-2"><div className={"font-medium " + (cur ? "text-primary" : "text-slate-700")}>{row.label}</div><div className="text-[11px] text-muted-foreground">{row.value}</div></td>
              <td className="p-2 text-center">{row.a}</td><td className="p-2 text-center">{row.b}</td><td className="p-2 text-center">{row.c}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
  push(<div><span className="font-bold text-slate-800">主要类型：{report.value3?.title || ""}</span></div>);
  push(<P>{report.value3?.content || ""}</P>);

  push(<SecTitle n="三" title="测评维度深度解读" />);
  push(<H3>（一）多模态测评记录</H3>);
  push(<P><Em>测评核心：</Em>聚焦日常及压力场景下的情绪表现，重点观察面对考试、学习挫折时的心态变化。</P>);
  push(<p className="font-semibold text-primary">结果解读：</p>);
  ["status_anxiety", "trait_anxiety", "study_anxiety"].forEach(k => value4[k] && push(<p key={k} className="leading-relaxed text-slate-600"><b className="text-slate-800">{value4[k].title}：</b>{value4[k].result}</p>));
  push(<ChartBlock height={260} option={barOption} />);

  push(<H3>（二）多元性向潜能发展测评</H3>);
  push(<P><Em>测评核心：</Em>从语文辞意、数学概念、抽象逻辑、立体空间、中文字词、中文语法等多个角度，观察学习相关的核心能力表现，判断不同学科学习中的优势与待提升点。</P>);
  push(<p className="font-semibold text-primary">结果解读：</p>);
  value6.forEach((it, i) => push(<p key={i} className="leading-relaxed text-slate-600"><b className="text-slate-800">{it.title}：</b>{it.content}</p>));
  push(<ChartBlock height={270} option={barXOption} />);

  push(<H3>（三）兴趣测评</H3>);
  push(<P><Em>测评核心：</Em>通过观察对不同活动、职业、课程的偏好，明确兴趣倾向，为学习动力激发、未来选科和职业规划提供参考。</P>);
  push(<p className="font-semibold text-primary">结果解读：</p>);
  INTEREST_FIXED.forEach((it, i) => push(<p key={i} className="leading-relaxed text-slate-600"><b className="text-slate-800">{it.t}</b>{it.v}</p>));
  push(
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <H3>兴趣组型</H3>
          <p className="text-[11px] text-muted-foreground">兴趣量表测验所得的兴趣组型</p>
          <div className="my-1 flex justify-around">{data1.map((it: any, i: number) => (<div key={i} className="text-center"><div className="text-3xl font-bold" style={{ color: it.color }}>{it.value}</div><div className="text-xs text-slate-600">{it.name}</div></div>))}</div>
          <ChartBlock height={200} option={radarOption} />
        </div>
        <div>
          <H3>兴趣类型分数图</H3>
          <p className="text-[11px] text-muted-foreground">各类兴趣类型得分直方图</p>
          <ChartBlock height={180} option={barYOption} />
          <div className="space-y-0.5 pl-8 pr-2 text-[11px]">
            <div className="flex"><span className="w-12 shrink-0 text-muted-foreground">得分排名</span><div className="grid flex-1 grid-cols-6 text-center">{scoresCake.map((s: any) => { const r = barY.find(b => b.name === s.name); return <span key={s.name} className="font-bold" style={{ color: RIASEC_COLOR[s.name] }}>({r?.rank})</span>; })}</div></div>
            <div className="flex"><span className="w-12 shrink-0 text-muted-foreground">兴趣类型</span><div className="grid flex-1 grid-cols-6 text-center">{scoresCake.map((s: any) => <span key={s.name} className="text-slate-600">{s.title}{s.name}</span>)}</div></div>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <div className="font-bold">区分性指标：<span style={{ color: "#BB1228" }}>{value8.diff_level || ""}</span></div>
          <p className="text-[11px] text-muted-foreground">各类型得分差异程度，等级越高越容易区分喜欢与不喜欢的兴趣类型。</p>
          <div className="mt-2 flex items-center justify-center gap-3 text-lg font-bold text-primary"><span>{value8.top3 || ""}</span><span className="text-muted-foreground text-sm">VS</span><span>{value8.self_introduce || ""}</span></div>
          <div className="flex justify-center gap-10 text-[11px] text-muted-foreground"><span>（兴趣组型）</span><span>（自我介绍组型）</span></div>
        </div>
        <div>
          <div className="font-bold">谐和度指标：<span style={{ color: "#BB1228" }}>{value8.norm_level || ""}</span></div>
          <p className="text-[11px] text-muted-foreground">兴趣组型与自我介绍组型的相近程度，等级越高越相近（高/中上/普通/低）。</p>
        </div>
      </div>
      <p className="mt-3 border-t pt-2 text-[11px] leading-relaxed text-muted-foreground">此页为测验结果的综合报告，即测验结果与重要指标的汇整。核心包括：兴趣组型、兴趣六角图、兴趣类型分数图、区分性和谐和度指标。在接下来的报告中将逐一详细说明与解释，可作为阅读时的参考工具。</p>
    </div>
  );
  push(<H3>兴趣六型解读</H3>);
  INTEREST_TYPE_TABLE.forEach(row => push(
    <div key={row.label} className="flex gap-3 rounded-lg border p-3 text-xs">
      <div className="w-20 shrink-0"><div className="font-bold text-slate-800">{row.label}</div><div className="text-[10px] text-muted-foreground">{row.value}</div></div>
      <div className="flex-1 space-y-1 text-slate-600"><p><b className="text-primary">兴趣类型：</b>{row.a}</p><p><b className="text-primary">职业活动：</b>{row.b}</p><p><b className="text-primary">性格特征：</b>{row.c}</p></div>
    </div>
  ));

  push(<H3>（四）主观自陈量表</H3>);
  push(<P><Em>测评核心：</Em>结合日常学习中的真实想法和行为，从自我认知、习惯养成、目标管理、支持感知等角度，分析学习过程中的内在状态。</P>);
  push(<p className="font-semibold text-primary">结果解读：</p>);
  value9.forEach((it, i) => push(<p key={i} className="leading-relaxed text-slate-600"><b className="text-slate-800">{it.name}：</b>{it.value}</p>));

  push(<SecTitle n="四" title="发展建议及能力提升方向" />);
  push(<P>结合学生当前学习状态与测评结果，建议从<b className="text-primary">{report.value3?.str || ""}</b>方向入手，针对性提升能力，充分发挥其学习潜力。</P>);
  push(<H3>（一）针对学生的抗压能力和情绪状态的建议</H3>);
  data2.forEach((item, i) => push(
    <div key={i}><div className="font-bold text-primary">{i + 1}、{item.title}</div>{(item.value || []).map((c: any, j: number) => <p key={j} className="leading-relaxed text-slate-600"><b className="text-primary">{c.title}</b>{c.value}</p>)}</div>
  ));
  push(<H3>（二）针对学习策略、学习动力等方面的提升建议</H3>);
  data3.forEach((item: any, i: number) => push(
    <div key={i}><div className="font-bold text-primary">{i + 1}、{item.title}</div>{(item.value || []).map((c: any, j: number) => <p key={j} className="leading-relaxed text-slate-600"><b className="text-slate-800">{c.title}</b>{c.value}</p>)}</div>
  ));
  if (data4.student.length || data4.parents.length) {
    push(<div className="font-bold text-primary">{data3.length + 1}、关于学生能感知到的支持的建议</div>);
    if (data4.student.length) { push(<div className="font-bold text-slate-800">@学生的建议：</div>); data4.student.forEach((c: any, i: number) => push(<p key={i} className="leading-relaxed text-slate-600"><b className="text-slate-800">{c.title}</b>{c.value}</p>)); }
    if (data4.parents.length) { push(<div className="font-bold text-slate-800">@家长建议：</div>); data4.parents.forEach((c: any, i: number) => push(<p key={i} className="leading-relaxed text-slate-600"><b className="text-slate-800">{c.title}</b>{c.value}</p>)); }
  }

  // ——— 分页测量 ———
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([]);
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    const groups: number[][] = []; let cur: number[] = []; let h = 0;
    kids.forEach((k, i) => {
      const bh = k.offsetHeight + 10;
      if (h + bh > CONTENT_H && cur.length) { groups.push(cur); cur = []; h = 0; }
      cur.push(i); h += bh;
    });
    if (cur.length) groups.push(cur);
    setPages(groups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const pageEls = Array.from(document.querySelectorAll("#report-root .a4-page")) as HTMLElement[];
      if (!pageEls.length) throw new Error("报告未就绪");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      for (let i = 0; i < pageEls.length; i++) {
        const canvas = await html2canvas(pageEls[i], { scale: 2, useCORS: true, backgroundColor: "#fff" });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, 210, 297);
      }
      pdf.save("个性化学习与发展评估报告.pdf");
    } catch (e: any) {
      toast.error(e?.message || "导出失败");
    } finally {
      setDownloading(false);
    }
  }

  async function copyPublicLink() {
    const url = `${window.location.origin}/report/${sessionId}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
      }
      toast.success("公开预览链接已复制 (免登录可直接打开)");
    } catch {
      toast.info("复制失败, 请手动复制: " + url, { duration: 10000 });
    }
  }

  const totalPages = pages.length + 1;
  const fmtDate = (d?: string) => (d ? d.replace(/(\d{4})-(\d{2})-(\d{2})/, "$1年$2月$3日") : "—");
  const Header = () => (
    <div style={{ height: HEADER_H }}>
      <div className="flex items-end justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/report/logo.png" alt="发展猫" className="h-7 object-contain" onError={(e: any) => { e.target.style.display = "none"; }} />
        <div className="text-right leading-tight">
          <div className="text-sm font-bold text-primary">个人报告</div>
          <div className="text-[11px] text-muted-foreground">评测日期：{fmtDate(report.dates)} &nbsp; 编号：{report.code || "—"}</div>
        </div>
      </div>
      <div className="mt-1 border-t border-slate-200" />
      <div className="h-[2px] bg-primary" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 工具栏: 公开模式只留下载, sticky 方便长页面操作 */}
      <div className="sticky top-2 z-10 mx-auto flex w-fit items-center gap-2 rounded-full border bg-white/90 px-3 py-1.5 shadow backdrop-blur">
        {mode === "admin" && (
          <>
            <Link href="/assessments/reports"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> 返回列表</Button></Link>
            <Button variant="outline" size="sm" onClick={copyPublicLink}>
              <LinkIcon className="h-4 w-4" /> 公开链接
            </Button>
          </>
        )}
        <Button size="sm" onClick={downloadPdf} disabled={downloading || !pages.length}>
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} 下载 PDF
        </Button>
      </div>

      {/* 离屏测量 (图表用占位, 不初始化 echarts) */}
      <MeasuringCtx.Provider value={true}>
        <div ref={measureRef} aria-hidden style={{ position: "absolute", left: -99999, top: 0, width: CONTENT_W }} className="text-[13px] text-slate-700">
          {blocks.map((b, i) => <div key={i} style={{ marginBottom: 10 }}>{b}</div>)}
        </div>
      </MeasuringCtx.Provider>

      {/* A4 分页 */}
      <div id="report-root" className="mx-auto flex w-fit flex-col items-center gap-5">
        {/* 封面 */}
        <div className="a4-page relative overflow-hidden bg-white shadow" style={{ width: PAGE_W, height: PAGE_H }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/report/top.png" alt="" className="pointer-events-none absolute right-0 top-0 w-2/3" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/report/bottom.png" alt="" className="pointer-events-none absolute bottom-0 left-0 w-2/3" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/report/logo.png" alt="发展猫" className="absolute left-12 top-10 h-9 object-contain" onError={(e: any) => { e.target.style.display = "none"; }} />
          <div className="relative flex h-full flex-col items-center px-16 pt-[36%] text-center">
            <h1 className="whitespace-nowrap text-[30px] font-bold leading-snug text-slate-800">《个性化学习与发展评估报告》</h1>
            <div className="my-5 h-1 w-16 rounded bg-primary" />
            <div className="text-xl font-bold text-slate-700">个人报告</div>
            <div className="mt-20 space-y-4 text-[15px]">
              {[["测评姓名", report.name], ["测评编号", report.code], ["测评日期", report.dates]].map(([l, v]) => (
                <div key={l} className="flex items-center justify-center">
                  <span className="w-20 text-right text-slate-600">{l}：</span>
                  <span className="inline-flex w-52 items-center justify-between font-medium">
                    <span>[</span><span className="flex-1 px-2 text-center">{v || "—"}</span><span>]</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 内容页 */}
        {pages.map((grp, pi) => (
          <div key={pi} className="a4-page relative flex flex-col bg-white shadow" style={{ width: PAGE_W, height: PAGE_H, padding: PAD }}>
            <Header />
            <div className="flex-1 overflow-hidden pt-3 text-[13px] text-slate-700">
              {grp.map(i => <div key={i} style={{ marginBottom: 10 }}>{blocks[i]}</div>)}
            </div>
            <div className="flex items-center justify-end border-t pt-1 text-[11px] text-muted-foreground" style={{ height: FOOTER_H }}>
              <span>第 {pi + 2} / {totalPages} 页</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
