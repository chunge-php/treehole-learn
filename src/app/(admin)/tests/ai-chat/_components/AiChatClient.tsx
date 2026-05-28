"use client";
import { useState, useRef, useTransition, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, Eraser, Loader2, MessageSquare, Sparkles, AlertTriangle, Bot, User, FileText } from "lucide-react";
import { buildSystemPrompt, type ChatBootstrap } from "../actions";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string; streaming?: boolean };

export function AiChatClient({ data }: { data: ChatBootstrap }) {
  const [studentId, setStudentId] = useState("");
  const [templateId, setTemplateId] = useState(data.templates[0]?.id || "");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [systemPromptPreview, setSystemPromptPreview] = useState<{ system_role: string; prefix_rendered: string; rules: string; full: string } | null>(null);
  const [previewing, startPreview] = useTransition();
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // 选学生/模板 → 刷新 system prompt 预览
  useEffect(() => {
    if (!studentId || !templateId) { setSystemPromptPreview(null); return; }
    startPreview(async () => {
      try {
        const p = await buildSystemPrompt({ end_user_id: studentId, template_id: templateId });
        setSystemPromptPreview(p);
      } catch (e: any) { toast.error(e?.message || "渲染失败"); }
    });
  }, [studentId, templateId]);

  async function send() {
    if (!studentId) { toast.error("请先选学生"); return; }
    if (!templateId) { toast.error("请先选模板"); return; }
    if (!input.trim()) return;
    if (sending) return;

    const userMessage = input.trim();
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(p => [...p, { role: "user", content: userMessage }, { role: "assistant", content: "", streaming: true }]);
    setInput("");
    setSending(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const resp = await fetch("/api/admin/coze-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ end_user_id: studentId, template_id: templateId, user_message: userMessage, history }),
        signal: ctrl.signal
      });
      if (!resp.ok || !resp.body) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`接口错误 [${resp.status}]: ${txt.slice(0, 200)}`);
      }
      await readSse(resp.body, (event, data) => {
        if (event === "delta" && data?.text != null) {
          setMessages(prev => {
            const i = prev.length - 1;
            if (i < 0 || prev[i].role !== "assistant") return prev;
            return [
              ...prev.slice(0, i),
              { ...prev[i], content: prev[i].content + data.text }
            ];
          });
        } else if (event === "done") {
          setMessages(prev => {
            const i = prev.length - 1;
            if (i < 0 || prev[i].role !== "assistant") return prev;
            return [
              ...prev.slice(0, i),
              { ...prev[i], streaming: false }
            ];
          });
        } else if (event === "error") {
          setMessages(prev => {
            const i = prev.length - 1;
            if (i < 0 || prev[i].role !== "assistant" || prev[i].content) return prev;
            return [
              ...prev.slice(0, i),
              { ...prev[i], content: `❌ ${data?.message || "请求失败"}`, streaming: false }
            ];
          });
          toast.error(data?.message || "请求失败");
        }
      });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          last.content = `❌ ${e?.message || String(e)}`;
          last.streaming = false;
        }
        return copy;
      });
      toast.error(e?.message || "请求失败");
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  function clear() {
    abortRef.current?.abort();
    setMessages([]);
  }

  return (
    <div className="space-y-4">
      {/* 顶部配置 + 提示 */}
      <Card className="p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>受测学生</Label>
            <Combobox
              options={data.students.map(u => ({
                value: u.id, label: u.name,
                hint: [u.grade, u.store || u.channel, u.phone].filter(Boolean).join(" · ")
              }))}
              value={studentId}
              onChange={setStudentId}
              placeholder="选学生 (system_prompt 用其档案填充)"
              searchPlaceholder="搜索…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>提示词模板</Label>
            <Combobox
              options={data.templates.map(t => ({ value: t.id, label: t.name, hint: t.code }))}
              value={templateId}
              onChange={setTemplateId}
              placeholder="选模板"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Badge variant={data.cozeConfigured ? "success" : "warning"}>
            {data.cozeConfigured ? "Coze 已配置" : "Coze 未配置 (mock 模式)"}
          </Badge>
          <span className="text-muted-foreground">workflow_id:</span>
          <code className="font-mono text-[11px]">{data.workflowId || "(未配置 COZE_WORKFLOW_AI_TUTOR)"}</code>
          <span className="text-muted-foreground ml-3">base:</span>
          <code className="font-mono text-[11px]">{data.baseUrl}</code>
        </div>
        {!data.cozeConfigured && (
          <div className="flex items-start gap-2 rounded-md bg-warning/10 border border-warning/30 p-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
            <div>本地 <code>.env.local</code> 未设置 <code>COZE_API_TOKEN</code> 或 <code>COZE_WORKFLOW_AI_TUTOR</code>, 当前走 mock 回复 — 仅用于验证 UI / 接口契约</div>
          </div>
        )}
      </Card>

      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat"><MessageSquare className="h-4 w-4" /> 聊天</TabsTrigger>
          <TabsTrigger value="prompt"><Sparkles className="h-4 w-4" /> system_prompt 预览</TabsTrigger>
          <TabsTrigger value="raw"><FileText className="h-4 w-4" /> 请求体</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="pt-3">
          <Card className="p-3 space-y-3">
            <div ref={scrollRef} className="h-[500px] overflow-y-auto rounded-md border bg-muted/20 p-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-20">
                  选好学生与模板后, 在下方发条消息开始测试
                </div>
              )}
              {messages.map((m, i) => (
                <Bubble key={i} msg={m} />
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder="输入问题, Enter 发送; Shift+Enter 换行"
                rows={2}
                className="resize-none"
                disabled={sending}
              />
              <div className="flex flex-col gap-2">
                <Button onClick={send} disabled={sending || !input.trim() || !studentId}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  发送
                </Button>
                <Button variant="ghost" size="sm" onClick={clear} disabled={messages.length === 0}>
                  <Eraser className="h-3.5 w-3.5" /> 清空
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="prompt" className="pt-3">
          {previewing && <Card className="p-12 text-center text-muted-foreground"><Loader2 className="h-5 w-5 inline animate-spin" /> 渲染中…</Card>}
          {!previewing && !systemPromptPreview && <Card className="p-12 text-center text-sm text-muted-foreground">先选学生 + 模板</Card>}
          {!previewing && systemPromptPreview && (
            <Card className="p-4 space-y-3">
              <div className="text-xs text-muted-foreground">总长度 {systemPromptPreview.full.length} 字符</div>
              <details open className="space-y-2">
                <summary className="cursor-pointer text-sm font-medium">📋 完整 system_prompt (扣子收到的内容)</summary>
                <pre className="mt-2 rounded bg-muted/40 p-3 text-xs whitespace-pre-wrap font-sans max-h-[500px] overflow-auto">{systemPromptPreview.full}</pre>
              </details>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="raw" className="pt-3">
          <Card className="p-3">
            <div className="text-xs text-muted-foreground mb-2">发给扣子工作流的请求体示例:</div>
            <pre className="text-xs rounded bg-muted/40 p-3 overflow-auto max-h-[500px]">{JSON.stringify({
              workflow_id: data.workflowId || "(未配置)",
              parameters: {
                system_prompt: systemPromptPreview?.full ? `<已渲染 ${systemPromptPreview.full.length} 字符>` : "(请先选学生+模板)",
                user_message: "<本次提问>",
                history: "<历史轮次 [{role, content}]>"
              }
            }, null, 2)}</pre>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${isUser ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
        {msg.content || (msg.streaming ? <span className="text-muted-foreground italic">思考中…</span> : null)}
        {msg.streaming && msg.content && <span className="inline-block w-2 h-3 align-middle ml-1 bg-current animate-pulse" />}
      </div>
    </div>
  );
}

async function readSse(body: ReadableStream<Uint8Array>, onEvent: (event: string, data: any) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let eventName = "message", dataStr = "";
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
      }
      if (!dataStr) continue;
      let payload: any = dataStr;
      try { payload = JSON.parse(dataStr); } catch { /* keep raw */ }
      onEvent(eventName, payload);
    }
  }
}
