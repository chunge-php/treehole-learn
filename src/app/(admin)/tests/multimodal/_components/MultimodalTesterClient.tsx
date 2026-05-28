"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { simulateMultimodal, saveMultimodalToProfile, previewPrompt, type StudentOpt } from "../actions";
import { SCORE_KEYS, SCORE_LABELS, type MultimodalScores } from "@/lib/multimodal/scoring";
import { Dices, Save, Loader2, Sparkles, FileJson, BarChart3, ListChecks } from "lucide-react";
import { toast } from "sonner";

type Template = { id: string; code: string; name: string; system_role: string; prefix_template: string; rules: string };
type Bias = "uniform" | "high" | "low" | "normal";

const BIAS_OPTIONS: { value: Bias; label: string; hint: string }[] = [
  { value: "normal",  label: "正态分布", hint: "中心 65, 多数 50-80" },
  { value: "high",    label: "全优偏置", hint: "70-95, 模拟优秀学生" },
  { value: "low",     label: "全差偏置", hint: "15-50, 模拟低状态" },
  { value: "uniform", label: "均匀随机", hint: "0-100, 极端测试" }
];

export function MultimodalTesterClient({ students, templates }: { students: StudentOpt[]; templates: Template[] }) {
  const [studentId, setStudentId] = useState("");
  const [bias, setBias] = useState<Bias>("normal");
  const [result, setResult] = useState<any>(null);
  const [externalJson, setExternalJson] = useState<any>(null);
  const [templateId, setTemplateId] = useState(templates[0]?.id || "");
  const [promptPreview, setPromptPreview] = useState<{ system_role: string; prefix_rendered: string; rules: string } | null>(null);

  const [running, startRun] = useTransition();
  const [saving, startSave] = useTransition();
  const [previewing, startPreview] = useTransition();

  function run() {
    startRun(async () => {
      try {
        const { result, externalJson } = await simulateMultimodal(bias, studentId || undefined);
        setResult(result); setExternalJson(externalJson);
      } catch (e: any) { toast.error(e?.message || "模拟失败"); }
    });
  }

  function save() {
    if (!studentId) { toast.error("请先选择学生"); return; }
    if (!result) { toast.error("先生成一次结果再保存"); return; }
    startSave(async () => {
      try {
        await saveMultimodalToProfile({ end_user_id: studentId, scores: result.scores as MultimodalScores });
        toast.success("已写入该学生档案 (multimodal_latest)");
      } catch (e: any) { toast.error(e?.message || "保存失败"); }
    });
  }

  function doPreview() {
    if (!studentId) { toast.error("请先选择学生"); return; }
    if (!templateId) { toast.error("请选择模板"); return; }
    startPreview(async () => {
      try {
        const p = await previewPrompt({ end_user_id: studentId, template_id: templateId });
        setPromptPreview(p);
      } catch (e: any) { toast.error(e?.message || "渲染失败"); }
    });
  }

  return (
    <div className="space-y-4">
      {/* 控制区 */}
      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>受测学生</Label>
            <Combobox
              options={students.map(u => ({
                value: u.id, label: u.name,
                hint: [u.grade, u.store || u.channel, u.phone].filter(Boolean).join(" · ")
              }))}
              value={studentId}
              onChange={setStudentId}
              placeholder="选择学生 (不选也可模拟, 但无法落库)"
              searchPlaceholder="搜索姓名/手机…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>模拟偏置</Label>
            <Combobox
              options={BIAS_OPTIONS.map(b => ({ value: b.value, label: b.label, hint: b.hint }))}
              value={bias}
              onChange={v => setBias(v as Bias)}
              placeholder="选择分值分布"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={run} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />}
              随机生成
            </Button>
            <Button variant="secondary" onClick={save} disabled={saving || !result || !studentId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存到档案
            </Button>
          </div>
        </div>
      </Card>

      {/* 结果区 */}
      {result && (
        <Card className="p-4">
          <Tabs defaultValue="scores">
            <TabsList>
              <TabsTrigger value="scores"><BarChart3 className="h-4 w-4" /> 分值</TabsTrigger>
              <TabsTrigger value="result"><ListChecks className="h-4 w-4" /> 等级与推荐</TabsTrigger>
              <TabsTrigger value="json"><FileJson className="h-4 w-4" /> 对外 JSON</TabsTrigger>
              <TabsTrigger value="prompt"><Sparkles className="h-4 w-4" /> AI 提示词预览</TabsTrigger>
            </TabsList>

            <TabsContent value="scores" className="pt-3">
              <div className="grid gap-3 md:grid-cols-3">
                {(["concentration", "stress", "status"] as const).map(k => {
                  const v = result.dimensions[k];
                  const name = { concentration: "专注力", stress: "抗压力", status: "学习状态" }[k];
                  return (
                    <div key={k} className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">{name}</div>
                      <div className="text-2xl font-semibold mt-1 tabular-nums">{v}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 space-y-1">
                {SCORE_KEYS.map(k => {
                  const sc = (result.scores as any)[k] as number;
                  const meta = SCORE_LABELS[k];
                  return (
                    <div key={k} className="flex items-center gap-3 text-sm">
                      <Badge variant="outline" className="shrink-0 w-20 justify-center">{meta.dim}</Badge>
                      <div className="flex-1 truncate">{meta.label}</div>
                      <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${sc}%` }} />
                      </div>
                      <div className="w-10 text-right tabular-nums font-medium">{sc}</div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="result" className="pt-3 space-y-3">
              <div className="flex items-baseline gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">综合分</div>
                  <div className="text-4xl font-bold tabular-nums">{result.composite}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">原始等级</div>
                  <div className="text-2xl font-semibold tabular-nums">{result.raw_level}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">校准等级</div>
                  <div className="text-2xl font-semibold tabular-nums text-primary">{result.final_level}</div>
                </div>
                <Badge variant="default" className="text-base px-3 py-1">{result.state_label}</Badge>
              </div>
              {result.adjustments?.length > 0 && (
                <div className="text-xs text-muted-foreground">校准: {result.adjustments.join("; ")}</div>
              )}
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-xs text-muted-foreground mb-1">核心评语</div>
                <div>{result.comment}</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground mb-1">推荐 — 小游戏</div>
                  <div className="font-medium">{result.recommendation.game.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">关键词: {result.recommendation.game.keywords}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground mb-1">推荐 — 微课程</div>
                  <div className="font-medium">{result.recommendation.course.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">关键词: {result.recommendation.course.keywords}</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="json" className="pt-3">
              <pre className="rounded-lg border bg-muted/40 p-3 text-xs overflow-auto max-h-[500px]">
                {JSON.stringify(externalJson, null, 2)}
              </pre>
            </TabsContent>

            <TabsContent value="prompt" className="pt-3 space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>提示词模板</Label>
                  <Combobox
                    options={templates.map(t => ({ value: t.id, label: t.name, hint: t.code }))}
                    value={templateId}
                    onChange={setTemplateId}
                    placeholder="选择模板"
                  />
                </div>
                <Button onClick={doPreview} disabled={previewing || !studentId}>
                  {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  渲染预览
                </Button>
              </div>
              {!studentId && <div className="text-xs text-muted-foreground">先在上方选择学生 (用其档案填充占位符)</div>}
              {promptPreview && (
                <div className="space-y-3">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground mb-1">System Role</div>
                    <div className="text-sm whitespace-pre-wrap">{promptPreview.system_role}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground mb-1">前置渲染后</div>
                    <pre className="text-xs whitespace-pre-wrap font-sans">{promptPreview.prefix_rendered}</pre>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground mb-1">答题规则</div>
                    <div className="text-sm whitespace-pre-wrap">{promptPreview.rules}</div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {!result && (
        <Card className="p-12 text-center text-muted-foreground">
          点击「随机生成」开始一次模拟测评
        </Card>
      )}
    </div>
  );
}
