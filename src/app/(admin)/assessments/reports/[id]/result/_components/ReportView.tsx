"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EChart } from "@/components/admin/EChart";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const RIASEC_COLOR: Record<string, string> = {
  R: "#4CA95E", I: "#02D1D4", A: "#2580CA", S: "#BB1228", E: "#AF8E40", C: "#9D6CDB",
};
const ROSE_PALETTE = ["#57DCC1", "#E04372", "#F6B901", "#7A4BFE", "#2E9AEB", "#7DD900", "#455DEF", "#CB40E4", "#FFEB3B"];

// 八维学格组合规则表 (静态)
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

// 兴趣 6 型解读 (静态)
const INTEREST_TYPE_TABLE = [
  { label: "实用型", value: "Realistic", a: "喜欢在讲求实际、技术规范下动手做明确的工作，对机械、仪器、工具、动能设备有兴趣。生活以实用为主，眼前的事胜于对未来的想象。情绪稳定，不善与人有深入的接触。", b: "适合从事机械、电子、土木建筑、生物科技等工作。", c: "情绪安稳、内向不善表达，严谨按部就班，谦虚有恒。" },
  { label: "研究型", value: "Investigative", a: "喜欢用理性思考分析，善于观察判断与推理，喜欢运用符号、概念、公式来面对工作以解决问题。", b: "喜欢从事物理、化学、生物、数学、医药等研发工作，有科学及数理的能力，不好领导与社交。", c: "重视方法分析、独立、批判、理性。" },
  { label: "艺术型", value: "Artistic", a: "善于创新、设计与美学的表达，喜欢用文字、动作、声音、色彩、音乐、舞蹈或戏剧来表达美的事物，语言能力高于数理。", b: "喜欢成为设计师、作家、画家、媒体人、音乐家、歌手与表演工作者。", c: "感性、有理想、不从众、有创意、善于表达、冲动。" },
  { label: "社会型", value: "Social", a: "善于与人相处，关怀与帮助他人的身心需求，希望了解、分析、鼓励、教导别人成为正向乐群的人。", b: "喜欢从事助人的工作，如教师、咨询师、社工师、医护人员、活动辅导员。", c: "温暖、亲切、仁慈、合作、同理、宽容、有责任、助人。" },
  { label: "企业型", value: "Enterprising", a: "喜欢运用规则能力、领导力和口语表达，组织安排及统筹管理人员，具有好的沟通能力，但较不在乎细部研发。", b: "喜欢销售、督导、策画、倡导等活动，有兴趣从事营销、采购、产销链、律师法官及公务行政等工作。", c: "精力充沛、动作快、冒险、外向、有企图心、社交、热情、决策快速。" },
  { label: "事务型", value: "Conventional", a: "注意细节及事务技能，擅长纪录、建文件、编辑文件或核算精细的数字。", b: "善于执行各项事务，整洁有序、服从规范；喜欢会计、行政、数据处理方面工作，如银行人员、金融分析师、税务专家、运输物流或会计出纳等。", c: "守本分、顺从、坚毅、节俭、有条理、谨慎、实际。" },
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

export function ReportView({ report, sessionId }: { report: any; sessionId: string }) {
  const [downloading, setDownloading] = useState(false);

  // ---------- 数据转换 (复刻旧前端 getReportPdfInit) ----------
  const pieData = useMemo(() => Object.entries(report.value2 || {}).map(([name, value]) => ({ name, value })), [report]);
  const value4 = report.value4 || {};
  const data2 = useMemo(() => [
    { title: value4.status_anxiety?.title || "状态焦虑", value: value4.status_anxiety?.proposal || [] },
    { title: value4.trait_anxiety?.title || "特质焦虑", value: value4.trait_anxiety?.proposal || [] },
    { title: value4.study_anxiety?.title || "感知压力", value: value4.study_anxiety?.proposal || [] },
  ], [report]);
  const value5: any[] = report.value5 || [];
  const value6: any[] = report.value6 || [];
  const value7: any[] = report.value7 || [];
  const value8 = report.value8 || {};
  const value9: any[] = report.value9 || [];

  const data1 = (value8.top3_arr || []).map((it: any) => ({ name: it.title, value: it.value, color: RIASEC_COLOR[it.value] }));
  const scoresCake: any[] = value8.scores_cake || [];
  const barY = useMemo(() => rankData(scoresCake), [report]);
  const radarData = scoresCake.map(s => s.value);
  const radarColor = RIASEC_COLOR[scoresCake.slice().sort((a, b) => b.value - a.value)[0]?.name] || "#4CA95E";

  // value10 拆分: 含学生/家长建议的进 data4, 其余进 data3
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

  // ---------- echarts options ----------
  const grad = (from: string, to: string) => ({ type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: from }, { offset: 1, color: to }] });
  const pieOption = {
    legend: { type: "scroll", orient: "vertical", right: 6, top: "center", textStyle: { fontSize: 11 } },
    tooltip: { trigger: "item" },
    series: [{ type: "pie", radius: [35, 105], center: ["38%", "50%"], roseType: "area", itemStyle: { borderRadius: 2 }, data: pieData, color: ROSE_PALETTE }],
  };
  const barOption = {
    grid: { top: 30, left: 40, right: 16, bottom: 24 },
    xAxis: { type: "category", data: value5.map(v => v.title), axisLabel: { color: "#999" }, axisLine: { lineStyle: { color: "#ECECEC" } } },
    yAxis: { type: "value", axisLabel: { color: "#999" }, splitLine: { lineStyle: { color: "#ECECEC" } } },
    tooltip: { trigger: "axis" },
    series: [{ type: "bar", data: value5.map(v => v.value), barWidth: "42%", itemStyle: { borderRadius: [4, 4, 0, 0], color: grad("#3aa0ff", "#bfe0ff") }, label: { show: true, position: "top", color: "#3180C3", fontWeight: 600 } }],
  };
  const barXOption = {
    grid: { top: 10, left: 90, right: 40, bottom: 10 },
    xAxis: { type: "value", max: 100, splitLine: { show: false }, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: "category", data: value7.map(v => v.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#666", fontSize: 12 } },
    series: [{ type: "bar", data: value7.map(v => v.value), barWidth: 13, itemStyle: { color: "#3180C3" }, label: { show: true, position: "right", color: "#3180C3", fontWeight: 600 } }],
  };
  const radarOption = {
    tooltip: {},
    radar: { indicator: [{ name: "实际", max: 100 }, { name: "研究", max: 100 }, { name: "艺术", max: 100 }, { name: "社会", max: 100 }, { name: "企业", max: 100 }, { name: "事务", max: 100 }], radius: 78, center: ["50%", "55%"], axisName: { color: "#666" } },
    series: [{ type: "radar", data: [{ value: radarData, areaStyle: { color: radarColor + "55" }, lineStyle: { color: radarColor }, itemStyle: { color: radarColor }, label: { show: true, color: "#666", fontSize: 10 } }] }],
  };
  const barYOption = {
    grid: { top: 30, left: 40, right: 10, bottom: 40, containLabel: true },
    xAxis: { type: "category", data: barY.map(it => it.title), axisLabel: { color: "#666", fontSize: 11, interval: 0 } },
    yAxis: { type: "value", min: 0, max: 100, axisLabel: { color: "#999" }, splitLine: { lineStyle: { color: "#ECECEC" } } },
    tooltip: { trigger: "axis" },
    series: [{
      type: "bar", barWidth: "46%",
      data: barY.map(it => ({ value: it.value, itemStyle: { borderRadius: [4, 4, 0, 0], color: grad(RIASEC_COLOR[it.name], (RIASEC_COLOR[it.name] || "#ccc") + "55") } })),
      label: { show: true, position: "top", color: "#3180C3", fontSize: 11, fontWeight: 600 },
    }],
  };

  async function downloadPdf() {
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const el = document.getElementById("report-root");
      if (!el) throw new Error("未找到报告内容");
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      const img = canvas.toDataURL("image/jpeg", 0.92);
      let heightLeft = imgH; let pos = 0;
      pdf.addImage(img, "JPEG", 0, pos, pageW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) { pos = heightLeft - imgH; pdf.addPage(); pdf.addImage(img, "JPEG", 0, pos, pageW, imgH); heightLeft -= pageH; }
      pdf.save(`学习与发展评估报告_${report.name || ""}.pdf`);
    } catch (e: any) {
      toast.error(e?.message || "导出失败");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 (不进 PDF) */}
      <div className="flex items-center justify-between">
        <Link href="/assessments/reports"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> 返回列表</Button></Link>
        <div className="flex gap-2">
          <Link href={`/assessments/reports/${sessionId}`}><Button variant="outline" size="sm">复核作答</Button></Link>
          <Button size="sm" onClick={downloadPdf} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} 下载 PDF
          </Button>
        </div>
      </div>

      {/* 报告主体 */}
      <div id="report-root" className="mx-auto max-w-[820px] rounded-xl border bg-white p-8 text-[13px] leading-relaxed text-slate-700 shadow-sm space-y-5">
        {/* 标题 */}
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-800">个性化学习与发展评估报告</h1>
          <p className="mt-1 text-sm text-muted-foreground">个人报告</p>
          <div className="mt-3 flex justify-center gap-6 text-sm">
            <span>姓名：<b>{report.name || "—"}</b></span>
            <span>编号：<b>{report.code || "—"}</b></span>
            <span>日期：<b>{report.dates || "—"}</b></span>
          </div>
        </div>

        {/* 一、通用导读 */}
        <Section n="一" title="通用导读" />
        <p>本报告基于多模态测评记录、多元性向潜能发展测评、兴趣测评及主观自陈量表四份测评，从抗压能力、自信心等 9 个维度，全面评估学生学习状态与发展潜力。报告将明确其学习类型，解读测评结果，并提供针对性发展建议，助力优化学习策略、改善学习心态。</p>

        <H3>学习发展综合数字画像</H3>
        <div className="flex items-start gap-4 rounded-lg bg-slate-50 p-4">
          <div className="flex-1">
            <div className="font-semibold text-slate-800">{report.value1?.title || ""}</div>
            <p className="mt-1">{report.value1?.content || ""}</p>
          </div>
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-xs">代表人物</span>
            <span className="text-sm font-bold">{report.value1?.name || "—"}</span>
          </div>
        </div>

        <H3>各维度数据展示</H3>
        <EChart option={pieOption} className="h-[260px] w-full" />

        {/* 二、综合结论与类型界定 */}
        <Section n="二" title="综合结论与类型界定" />
        <div className="rounded-lg bg-primary/5 px-4 py-3">
          经过测评，您在八维学格类型中属于：<b className="text-primary text-base">{report.value3?.title || ""}</b>
        </div>
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border p-2 text-left">八维学格</th>
              <th className="border p-2">多模态 E</th>
              <th className="border p-2">多元性向 R</th>
              <th className="border p-2">自陈量表 S</th>
            </tr>
          </thead>
          <tbody>
            {OCTUPLE_TABLE.map(row => {
              const cur = row.label === report.value3?.title;
              return (
                <tr key={row.label} className={cur ? "bg-primary/10 font-medium" : ""}>
                  <td className="border p-2 text-left"><div>{row.label}</div><div className="text-[11px] text-muted-foreground">{row.value}</div></td>
                  <td className="border p-2">{row.a}</td><td className="border p-2">{row.b}</td><td className="border p-2">{row.c}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-[11px] text-muted-foreground">l-表示低 &nbsp; h-表示高</p>
        <H3>主要类型：{report.value3?.title || ""}</H3>
        <p>{report.value3?.content || ""}</p>

        {/* 三、测评维度深度解读 */}
        <Section n="三" title="测评维度深度解读" />
        <H3>（一）多模态测评记录</H3>
        <p><Em>测评核心：</Em>聚焦日常及压力场景下的情绪表现，重点观察面对考试、学习挫折时的心态变化。</p>
        <p><Em>结果解读：</Em></p>
        {["status_anxiety", "trait_anxiety", "study_anxiety"].map(k => value4[k] && (
          <p key={k}><b>{value4[k].title}：</b>{value4[k].result}</p>
        ))}
        <EChart option={barOption} className="h-[280px] w-full" />

        <H3>（二）多元性向潜能发展测评</H3>
        <p><Em>测评核心：</Em>从语文辞意、数学概念、抽象逻辑、立体空间、中文字词、中文语法等多个角度，观察学习相关的核心能力表现，判断不同学科学习中的优势与待提升点。</p>
        <p><Em>结果解读：</Em></p>
        {value6.map((it, i) => <p key={i}><b>{it.title}：</b>{it.content}</p>)}
        <EChart option={barXOption} className="h-[300px] w-full" />

        <H3>（三）兴趣测评</H3>
        <p><Em>测评核心：</Em>通过观察对不同活动、职业、课程的偏好，明确兴趣倾向，为学习动力激发、未来选科和职业规划提供参考。</p>
        <p><Em>结果解读：</Em></p>
        {INTEREST_FIXED.map((it, i) => <p key={i}><b>{it.t}</b>{it.v}</p>)}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <H3>兴趣组型</H3>
            <p className="text-[11px] text-muted-foreground">兴趣量表测验所得的兴趣组型</p>
            <div className="my-2 flex justify-around">
              {data1.map((it: any, i: number) => (
                <div key={i} className="text-center"><div className="text-2xl font-bold" style={{ color: it.color }}>{it.value}</div><div className="text-xs">{it.name}</div></div>
              ))}
            </div>
            <EChart option={radarOption} className="h-[220px] w-full" />
          </div>
          <div>
            <H3>兴趣类型分数图</H3>
            <p className="text-[11px] text-muted-foreground">各类兴趣类型得分直方图</p>
            <EChart option={barYOption} className="h-[240px] w-full" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
          <div>
            <div className="font-semibold">区分性指标：<span className="text-primary">{value8.diff_level || ""}</span></div>
            <p className="text-[11px] text-muted-foreground">各类型得分差异程度，等级越高越容易区分喜欢与不喜欢的兴趣类型。</p>
            <div className="mt-2 flex items-center justify-center gap-3 text-lg font-bold">
              <span>{value8.top3 || ""}</span><span className="text-muted-foreground text-sm">VS</span><span>{value8.self_introduce || ""}</span>
            </div>
            <div className="flex justify-center gap-8 text-[11px] text-muted-foreground"><span>（兴趣组型）</span><span>（自我介绍组型）</span></div>
          </div>
          <div>
            <div className="font-semibold">谐和度指标：<span className="text-primary">{value8.norm_level || ""}</span></div>
            <p className="text-[11px] text-muted-foreground">兴趣组型与自我介绍组型的相近程度，等级越高越相近（高/中上/普通/低）。</p>
          </div>
        </div>

        <table className="w-full border-collapse text-xs">
          <thead><tr className="bg-slate-100"><th className="border p-2 w-24">类型</th><th className="border p-2 text-left">解读</th></tr></thead>
          <tbody>
            {INTEREST_TYPE_TABLE.map(row => (
              <tr key={row.label}>
                <td className="border p-2 text-center"><div className="font-medium">{row.label}</div><div className="text-[10px] text-muted-foreground">{row.value}</div></td>
                <td className="border p-2 space-y-1">
                  <p><b>兴趣类型：</b>{row.a}</p><p><b>职业活动：</b>{row.b}</p><p><b>性格特征：</b>{row.c}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <H3>（四）主观自陈量表</H3>
        <p><Em>测评核心：</Em>结合日常学习中的真实想法和行为，从自我认知、习惯养成、目标管理、支持感知等角度，分析学习过程中的内在状态。</p>
        <p><Em>结果解读：</Em></p>
        {value9.map((it, i) => <p key={i}><b>{it.name}：</b>{it.value}</p>)}

        {/* 四、发展建议 */}
        <Section n="四" title="发展建议及能力提升方向" />
        <p>结合学生当前学习状态与测评结果，建议从<b className="text-primary">{report.value3?.str || ""}</b>方向入手，针对性提升能力，充分发挥其学习潜力。</p>

        <H3>（一）针对学生的抗压能力和情绪状态的建议</H3>
        {data2.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="font-medium text-primary">{i + 1}、{item.title}</div>
            {(item.value || []).map((c: any, j: number) => <p key={j}><b className="text-primary">{c.title}</b>{c.value}</p>)}
          </div>
        ))}

        <H3>（二）针对学习策略、学习动力等方面的提升建议</H3>
        {data3.map((item: any, i: number) => (
          <div key={i} className="space-y-1">
            <div className="font-medium text-primary">{i + 1}、{item.title}</div>
            {(item.value || []).map((c: any, j: number) => <p key={j}><b>{c.title}</b>{c.value}</p>)}
          </div>
        ))}

        {(data4.student.length > 0 || data4.parents.length > 0) && (
          <>
            <H3>{data3.length + 1}、关于学生能感知到的支持的建议</H3>
            {data4.student.length > 0 && <>
              <div className="font-medium">@学生的建议：</div>
              {data4.student.map((c: any, i: number) => <p key={i}><b>{c.title}</b>{c.value}</p>)}
            </>}
            {data4.parents.length > 0 && <>
              <div className="font-medium mt-2">@家长建议：</div>
              {data4.parents.map((c: any, i: number) => <p key={i}><b>{c.title}</b>{c.value}</p>)}
            </>}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ n, title }: { n: string; title: string }) {
  return <h2 className="mt-6 border-l-4 border-primary pl-3 text-lg font-bold text-slate-800">{n}、{title}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-3 font-semibold text-slate-800">{children}</h3>;
}
function Em({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-primary">{children}</span>;
}
