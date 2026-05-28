"use client";
import { useState, useTransition, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { previewLetterContext, runLetterGeneration, saveWishLetter, listWishItems, addTestWishItem, deleteWishItem, type StudentOpt } from "../actions";
import { Wand2, FileText, Save, Loader2, Mail, Eye, Plus, Trash2, ListTodo } from "lucide-react";
import { toast } from "sonner";

type TemplateMeta = { id: string; code: string; name: string; system_role: string; prefix_template: string; rules: string } | null;

export function WishLetterTesterClient({
  students, defaultYear, defaultMonth, defaultTemplate
}: { students: StudentOpt[]; defaultYear: number; defaultMonth: number; defaultTemplate: TemplateMeta }) {
  const [studentId, setStudentId] = useState("");
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [content, setContent] = useState("");
  const [meta, setMeta] = useState<{ mock?: boolean; debugUrl?: string; studentName?: string }>({});
  const [rendered, setRendered] = useState("");
  const [tplMeta, setTplMeta] = useState<{ name?: string; system_role?: string; rules?: string; prefix_template?: string }>(defaultTemplate || {});

  const [items, setItems] = useState<Array<{ id: string; content: string; createdAt: string }>>([]);
  const [newWish, setNewWish] = useState("");

  const [previewing, startPreview] = useTransition();
  const [running, startRun] = useTransition();
  const [saving, startSave] = useTransition();
  const [loadingItems, startLoadItems] = useTransition();
  const [adding, startAdd] = useTransition();

  function refreshItems() {
    if (!studentId) { setItems([]); return; }
    startLoadItems(async () => {
      try {
        const list = await listWishItems({ endUserId: studentId, year, month });
        setItems(list);
      } catch (e: any) { toast.error(e?.message || "拉心愿条目失败"); }
    });
  }

  function addWish() {
    if (!studentId) { toast.error("请先选择学生"); return; }
    if (!newWish.trim()) { toast.error("写一条心愿"); return; }
    startAdd(async () => {
      try {
        await addTestWishItem({ endUserId: studentId, content: newWish.trim(), year, month });
        setNewWish("");
        refreshItems();
        toast.success("已加入心愿条目");
      } catch (e: any) { toast.error(e?.message || "添加失败"); }
    });
  }

  function removeWish(id: string) {
    startAdd(async () => {
      try {
        await deleteWishItem({ id });
        refreshItems();
      } catch (e: any) { toast.error(e?.message || "删除失败"); }
    });
  }

  // 学生/年/月 变化时自动刷新心愿条目
  useEffect(() => { refreshItems(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [studentId, year, month]);

  function preview() {
    if (!studentId) { toast.error("请先选择学生"); return; }
    startPreview(async () => {
      try {
        const p = await previewLetterContext({ endUserId: studentId, year, month });
        setRendered(p.rendered);
        setTplMeta({ name: p.template.name, system_role: p.template.system_role, rules: p.template.rules, prefix_template: p.template.prefix_template });
        toast.success("已渲染档案上下文 (未调扣子)");
      } catch (e: any) { toast.error(e?.message || "渲染失败"); }
    });
  }

  function run() {
    if (!studentId) { toast.error("请先选择学生"); return; }
    setContent("");
    setMeta({});
    startRun(async () => {
      try {
        const res = await fetch("/api/admin/wishes/generate-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endUserId: studentId, year, month })
        });
        if (!res.ok || !res.body) {
          const t = await res.text().catch(() => "");
          toast.error(`生成失败 [${res.status}] ${t.slice(0, 100)}`);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let acc = "";
        outer:
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n\n")) >= 0) {
            const chunk = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            let eventName = "";
            let data = "";
            for (const line of chunk.split("\n")) {
              if (line.startsWith("event:")) eventName = line.slice(6).trim();
              else if (line.startsWith("data:")) data += line.slice(5).trim();
            }
            if (!eventName) continue;
            let payload: any = {};
            try { payload = JSON.parse(data); } catch {}
            if (eventName === "context") {
              setRendered(payload.rendered || "");
              setMeta(m => ({ ...m, studentName: payload.student_name }));
            } else if (eventName === "delta") {
              acc += payload.text || "";
              setContent(acc);
            } else if (eventName === "done") {
              if (payload.content) { acc = payload.content; setContent(acc); }
              setMeta(m => ({ ...m, mock: !!payload.mock, debugUrl: payload.debugUrl }));
              toast.success(payload.mock ? "已用 mock 出一封 (未配置扣子)" : "扣子流式返回完成");
              break outer;
            } else if (eventName === "error") {
              toast.error(payload.error || "流式失败");
              break outer;
            }
          }
        }
      } catch (e: any) { toast.error(e?.message || "生成失败"); }
    });
  }

  function save() {
    if (!studentId) { toast.error("请先选择学生"); return; }
    if (!content.trim()) { toast.error("先生成或手填一段正文"); return; }
    startSave(async () => {
      try {
        const r = await saveWishLetter({ endUserId: studentId, year, month, content: content.trim() });
        const stamp = `${year}年${String(month).padStart(2, "0")}月`;
        toast.success(`已写入信件库 (${meta.studentName || "该学生"} · ${stamp})`);
        const fields = r.profileChangedFields || [];
        if (fields.length > 0) {
          toast.success(`档案已回写 ${fields.length} 项: ${fields.slice(0, 4).join(", ")}${fields.length > 4 ? " ..." : ""}`);
        } else {
          toast.info("档案回写: 0 字段变更 (扣子未配置 / 内容已无新信息)");
        }
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

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ListTodo className="h-4 w-4" />
            本月学生提出的心愿条目
            <Badge variant="secondary">{items.length} 条</Badge>
            {loadingItems && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
          <span className="text-xs text-muted-foreground">扣子生成信件时会读取这些</span>
        </div>

        <div className="flex gap-2 mb-3">
          <Input
            value={newWish}
            onChange={(e) => setNewWish(e.target.value)}
            placeholder="例如: 我想要一本《盗墓笔记》全集 / 想去长白山看看 / 这个周末别让我补课"
            maxLength={300}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addWish(); } }}
            disabled={!studentId}
          />
          <Button onClick={addWish} disabled={adding || !studentId || !newWish.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {items.length > 0 ? (
          <div className="space-y-1.5">
            {items.map((w, i) => (
              <div key={w.id} className="flex items-center gap-2 text-sm bg-muted/40 rounded px-3 py-2">
                <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                <span className="flex-1">{w.content}</span>
                <span className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</span>
                <Button size="sm" variant="ghost" onClick={() => removeWish(w.id)} className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : studentId ? (
          <div className="text-xs text-muted-foreground text-center py-4 italic">
            该学生本月还没有心愿. 试着写一条 (会按学生第一人称写进信里)
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4 italic">先选学生</div>
        )}
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
            <div className="flex items-center justify-between">
              {tplMeta.name && <div className="text-sm font-medium">{tplMeta.name}</div>}
              <a href="/tests/prompt-templates" className="text-xs text-blue-600 underline">去编辑 →</a>
            </div>
            <div>
              <Label className="text-xs">system_role (扣子 System Prompt 的第一段)</Label>
              <pre className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap mt-1 max-h-64 overflow-auto">{tplMeta.system_role || "(空 — migration 32 / seed 还没跑过?)"}</pre>
            </div>
            <div>
              <Label className="text-xs">prefix_template (档案占位符模板, 渲染后塞给扣子的 student_context)</Label>
              <pre className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap mt-1 max-h-64 overflow-auto">{tplMeta.prefix_template || "—"}</pre>
            </div>
            <div>
              <Label className="text-xs">rules (扣子 System Prompt 的第二段)</Label>
              <pre className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap mt-1 max-h-64 overflow-auto">{tplMeta.rules || "—"}</pre>
            </div>
            <p className="text-xs text-muted-foreground">code = <code>monthly_wish_letter</code></p>
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
