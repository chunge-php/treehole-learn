"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { previewLetterContext, runLetterGeneration, saveWishLetter, type StudentOpt } from "../actions";
import { Wand2, FileText, Save, Loader2, Mail, Eye } from "lucide-react";
import { toast } from "sonner";

export function WishLetterTesterClient({
  students, defaultYear, defaultMonth
}: { students: StudentOpt[]; defaultYear: number; defaultMonth: number }) {
  const [studentId, setStudentId] = useState("");
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [content, setContent] = useState("");
  const [meta, setMeta] = useState<{ mock?: boolean; debugUrl?: string; studentName?: string }>({});
  const [rendered, setRendered] = useState("");
  const [tplMeta, setTplMeta] = useState<{ name?: string; system_role?: string; rules?: string }>({});

  const [previewing, startPreview] = useTransition();
  const [running, startRun] = useTransition();
  const [saving, startSave] = useTransition();

  function preview() {
    if (!studentId) { toast.error("请先选择学生"); return; }
    startPreview(async () => {
      try {
        const p = await previewLetterContext({ endUserId: studentId, year, month });
        setRendered(p.rendered);
        setTplMeta({ name: p.template.name, system_role: p.template.system_role, rules: p.template.rules });
        toast.success("已渲染档案上下文 (未调扣子)");
      } catch (e: any) { toast.error(e?.message || "渲染失败"); }
    });
  }

  function run() {
    if (!studentId) { toast.error("请先选择学生"); return; }
    startRun(async () => {
      try {
        const r = await runLetterGeneration({ endUserId: studentId, year, month });
        setContent(r.content);
        setRendered(r.rendered);
        setMeta({ mock: r.mock, debugUrl: r.debugUrl, studentName: r.studentName });
        toast.success(r.mock ? "已用 mock 出一封 (未配置扣子)" : "扣子返回成功");
      } catch (e: any) { toast.error(e?.message || "生成失败"); }
    });
  }

  function save() {
    if (!studentId) { toast.error("请先选择学生"); return; }
    if (!content.trim()) { toast.error("先生成或手填一段正文"); return; }
    startSave(async () => {
      try {
        await saveWishLetter({ endUserId: studentId, year, month, content: content.trim() });
        toast.success(`已写入信件库 (${meta.studentName || "该学生"} · ${year}年${String(month).padStart(2, "0")}月)`);
      } catch (e: any) { toast.error(e?.message || "保存失败"); }
    });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label>受测学生</Label>
            <Combobox
              options={students.map(u => ({
                value: u.id, label: u.name,
                hint: [u.grade, u.store || u.channel, u.phone].filter(Boolean).join(" · ")
              }))}
              value={studentId}
              onChange={setStudentId}
              placeholder="选择学生 (按渠道/店铺/手机号搜)"
              searchPlaceholder="姓名 / 年级 / 手机..."
              emptyPlaceholder="没有可选学生"
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label>年</Label>
            <Input type="number" min={2024} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value) || defaultYear)} />
          </div>
          <div className="space-y-1.5">
            <Label>月</Label>
            <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value) || defaultMonth)} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={preview} disabled={previewing}>
            {previewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            预览档案上下文
          </Button>
          <Button onClick={run} disabled={running} variant="default">
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            生成信件
          </Button>
          <Button onClick={save} disabled={saving || !content.trim()} variant="outline">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            保存到信件库
          </Button>
          {meta.mock && <Badge variant="outline" className="ml-2">⚠ Mock 模式 (扣子未配置)</Badge>}
          {meta.debugUrl && <a href={meta.debugUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline self-center">扣子调试链接</a>}
        </div>
      </Card>

      <Tabs defaultValue="letter">
        <TabsList>
          <TabsTrigger value="letter"><Mail className="mr-1 h-3 w-3" />信件正文</TabsTrigger>
          <TabsTrigger value="context"><FileText className="mr-1 h-3 w-3" />档案上下文</TabsTrigger>
          <TabsTrigger value="template">提示词模板</TabsTrigger>
        </TabsList>

        <TabsContent value="letter">
          <Card className="p-4">
            <Label className="mb-2 block">信件正文 (可手动修改后再保存)</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              placeholder="点击「生成信件」后这里会出现 300-400 字的家长信..."
              className="font-serif leading-relaxed"
            />
            <div className="mt-2 text-xs text-muted-foreground">
              字数: {content.length} / 目标 300-400 字
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="context">
          <Card className="p-4">
            <Label className="mb-2 block">渲染后的学生档案上下文 (扣子收到的 student_context 参数)</Label>
            <pre className="text-xs bg-muted/50 p-4 rounded-md whitespace-pre-wrap font-mono leading-relaxed">
              {rendered || "点击「预览档案上下文」或「生成信件」"}
            </pre>
          </Card>
        </TabsContent>

        <TabsContent value="template">
          <Card className="p-4 space-y-3">
            {tplMeta.name && <div className="text-sm font-medium">{tplMeta.name}</div>}
            <div>
              <Label className="text-xs">system_role</Label>
              <pre className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap mt-1">{tplMeta.system_role || "—"}</pre>
            </div>
            <div>
              <Label className="text-xs">rules</Label>
              <pre className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap mt-1">{tplMeta.rules || "—"}</pre>
            </div>
            <p className="text-xs text-muted-foreground">改提示词请去 <a href="/tests/prompt-templates" className="underline">提示词模板</a>, code = <code>monthly_wish_letter</code></p>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="p-3 bg-amber-50 border-amber-200">
        <p className="text-xs text-amber-900">
          <strong>扣子工作流配置</strong>:
          需要新建一个工作流, workflow_id 填到 <code>COZE_WORKFLOW_WISH_LETTER</code> 环境变量。
          工作流输入参数: <code>system_role / student_context / rules / year / month</code>, 输出: <code>letter</code> 字符串。
          没配前一直走 mock (返回固定示例文本) 不阻塞测试.
        </p>
      </Card>
    </div>
  );
}
