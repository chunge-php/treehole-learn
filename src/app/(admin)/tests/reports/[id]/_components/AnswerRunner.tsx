"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/admin/SafeImage";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { saveAnswer, quickFillAnswers, answerVoiceWithSample } from "../../actions";
import { DIMENSION_VARIANT, QTYPE_VARIANT } from "@/app/(admin)/assessments/_components/constants";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Loader2, LayoutGrid, FileBarChart, Mic, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Opt = { label?: string; value: string; media_url?: string; media_type?: "image" | "video" };
type Question = {
  id: string; title: string; description?: string | null; cover_url?: string | null;
  media_urls?: { url: string; type?: string }[]; dimension: string; qtype: string;
  options?: Opt[]; project_name?: string | null;
};

const isUrl = (s?: string) => !!s && /^https?:\/\/\S+$/i.test(s.trim());

export function AnswerRunner({
  sessionId, sessionName, total, questions, initialAnswers
}: {
  sessionId: string;
  sessionName: string;
  total: number;
  questions: Question[];
  initialAnswers: Record<string, string | null>;
}) {
  const [answers, setAnswers] = useState<Record<string, string | null>>(initialAnswers);
  const answeredSet = useMemo(() => new Set(Object.keys(answers)), [answers]);
  const answeredCount = useMemo(
    () => questions.reduce((n, q) => (q.id in answers ? n + 1 : n), 0),
    [answers, questions]
  );
  const firstUnanswered = Math.max(0, questions.findIndex(q => !(q.id in initialAnswers)));
  const [idx, setIdx] = useState(firstUnanswered === -1 ? 0 : firstUnanswered);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showNav, setShowNav] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickPending, startQuick] = useTransition();
  // 语音题焦虑分展示 (本次作答得到的)
  const [voiceExtend, setVoiceExtend] = useState<Record<string, { status_anxiety_score: number; trait_anxiety_score: number; learning_stress_score: number } | null>>({});

  async function answerVoice() {
    if (!q || savingId) return;
    const wasAnswered = q.id in answers;
    setSavingId(q.id);
    try {
      const r: any = await answerVoiceWithSample(sessionId, q.id);
      setAnswers(prev => ({ ...prev, [q.id]: "(语音作答)" }));
      setVoiceExtend(prev => ({ ...prev, [q.id]: r?.extend ?? null }));
      if (!r?.extend) toast.warning("已作答, 但发展猫未返回焦虑分 (检查 FAZHANMAO_URL/网络)");
      else toast.success("已获取多模态焦虑分");
      if (!wasAnswered && idx < questions.length - 1) setIdx(i => i + 1);
    } catch (e: any) {
      toast.error(e?.message || "作答失败");
    } finally {
      setSavingId(null);
    }
  }

  const completed = total > 0 && answeredCount >= total;
  const q = questions[idx];
  const pct = total ? Math.round((answeredCount / total) * 100) : 0;

  async function select(value: string) {
    if (!q || savingId) return;
    const wasAnswered = q.id in answers;
    setSavingId(q.id);
    // 乐观更新
    setAnswers(prev => ({ ...prev, [q.id]: value }));
    try {
      await saveAnswer(sessionId, q.id, value);
      // 首次作答自动前进; 修改已答则停留
      if (!wasAnswered && idx < questions.length - 1) setIdx(i => i + 1);
    } catch (e: any) {
      toast.error(e?.message || "保存失败, 请重试");
      setAnswers(prev => {
        const n = { ...prev };
        if (!wasAnswered) delete n[q.id]; // 回滚新增
        return n;
      });
    } finally {
      setSavingId(null);
    }
  }

  function runQuickFill() {
    startQuick(async () => {
      try {
        const r = await quickFillAnswers(sessionId);
        setAnswers(r.answers);
        setQuickOpen(false);
        toast.success(`已自动填充 ${r.filled} 题, 全部 ${r.answered}/${r.total} 题完成`);
      } catch (e: any) {
        toast.error(e?.message || "操作失败");
      }
    });
  }

  if (!q) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        该记录没有可作答的题目 (题库可能已清空)。
        <div className="mt-4">
          <Link href="/tests/reports"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> 返回列表</Button></Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 顶部: 返回 + 名称 + 进度 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/tests/reports">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> 返回列表</Button>
          </Link>
          <span className="font-medium">{sessionName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowNav(v => !v)}>
            <LayoutGrid className="h-3.5 w-3.5" /> 题目导航
          </Button>
          {!completed && (
            <Button variant="outline" size="sm" onClick={() => setQuickOpen(true)} disabled={quickPending}>
              {quickPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />} 一键答完
            </Button>
          )}
          {completed ? (
            <Link href={`/tests/reports/${sessionId}/result`}>
              <Button size="sm"><FileBarChart className="h-3.5 w-3.5" /> 查看报告</Button>
            </Link>
          ) : (
            <Button size="sm" disabled title="答完全部题目后可生成报告">
              <FileBarChart className="h-3.5 w-3.5" /> 查看报告
            </Button>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", completed ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm tabular-nums text-muted-foreground shrink-0">已答 {answeredCount}/{total} ({pct}%)</span>
      </div>

      {completed && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">
          <Check className="h-4 w-4" /> 全部题目已作答完成, 可点右上角「查看报告」生成结果。
        </div>
      )}

      {/* 题目导航网格 */}
      {showNav && (
        <Card className="p-3">
          <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
            {questions.map((qq, i) => {
              const ans = qq.id in answers;
              return (
                <button
                  key={qq.id}
                  onClick={() => setIdx(i)}
                  className={cn(
                    "h-7 w-7 shrink-0 rounded text-[11px] tabular-nums border transition-colors",
                    i === idx && "ring-2 ring-primary",
                    ans ? "bg-success/15 border-success/40 text-success" : "bg-background border-input text-muted-foreground hover:bg-accent"
                  )}
                >{i + 1}</button>
              );
            })}
          </div>
        </Card>
      )}

      {/* 题目卡片 */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">第 {idx + 1} / {questions.length} 题</span>
            <Badge variant={DIMENSION_VARIANT[q.dimension] || "default"}>{q.dimension}</Badge>
            <Badge variant={QTYPE_VARIANT[q.qtype] || "outline"}>{q.qtype}</Badge>
            {q.project_name && <span className="text-xs">· {q.project_name}</span>}
          </div>
          {(q.id in answers) && <Badge variant="success"><Check className="h-3 w-3" /> 已答</Badge>}
        </div>

        <div>
          <h2 className="text-lg font-medium leading-relaxed">{q.title}</h2>
          {q.description && <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">{q.description}</p>}
        </div>

        {q.cover_url && (
          <SafeImage src={q.cover_url} className="max-h-60 rounded-lg border object-contain" />
        )}
        {Array.isArray(q.media_urls) && q.media_urls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {q.media_urls.map((m, i) => (m.type || "").startsWith("video")
              ? <video key={i} src={m.url} controls className="max-h-60 rounded-lg border" />
              : <SafeImage key={i} src={m.url} className="max-h-60 rounded-lg border object-contain" />)}
          </div>
        )}

        {/* 选项 / 语音题 */}
        {q.qtype === "语音题" ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-5 text-center space-y-3">
            <p className="text-sm text-muted-foreground"><Mic className="inline h-4 w-4 -mt-0.5" /> 语音题: 用测试语音调发展猫 API 获取多模态焦虑分。</p>
            <Button
              variant={q.id in answers ? "secondary" : "default"}
              disabled={savingId === q.id}
              onClick={answerVoice}
            >
              {savingId === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              {q.id in answers ? "重新用测试语音作答" : "用测试语音作答"}
            </Button>
            {voiceExtend[q.id] && (
              <div className="flex justify-center gap-4 pt-1 text-sm">
                <span>状态焦虑 <b className="text-primary">{voiceExtend[q.id]!.status_anxiety_score}</b></span>
                <span>特质焦虑 <b className="text-primary">{voiceExtend[q.id]!.trait_anxiety_score}</b></span>
                <span>感知压力 <b className="text-primary">{voiceExtend[q.id]!.learning_stress_score}</b></span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {(q.options || []).map((o, i) => {
              const value = o.value || String.fromCharCode(65 + i);
              const mediaUrl = o.media_url || (isUrl(o.label) ? o.label!.trim() : "");
              const text = isUrl(o.label) ? "" : (o.label || "");
              const selected = answers[q.id] === value;
              return (
                <button
                  key={i}
                  disabled={savingId === q.id}
                  onClick={() => select(value)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    selected ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-input bg-background hover:bg-accent",
                    savingId === q.id && "opacity-60"
                  )}
                >
                  <span className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-sm",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground"
                  )}>{selected ? <Check className="h-4 w-4" /> : value}</span>
                  {mediaUrl && (o.media_type === "video"
                    ? <video src={mediaUrl} controls className="h-16 rounded border" />
                    : <SafeImage src={mediaUrl} className="h-16 w-16 rounded border object-cover" showTip={false} />)}
                  {text && <span className="flex-1 text-sm">{text}</span>}
                  {!text && !mediaUrl && <span className="flex-1 text-sm text-muted-foreground">选项 {value}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* 翻页 */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" disabled={idx === 0} onClick={() => setIdx(i => Math.max(0, i - 1))}>
            <ChevronLeft className="h-4 w-4" /> 上一题
          </Button>
          <span className="text-xs text-muted-foreground">选中选项即自动保存并跳转下一题</span>
          <Button variant="outline" size="sm" disabled={idx >= questions.length - 1} onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))}>
            下一题 <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={quickOpen}
        onOpenChange={v => !v && setQuickOpen(false)}
        title="一键答完所有问题"
        description={`将给剩余未答的 ${total - answeredCount} 道题随机填入有效答案并标记完成 (测试用), 已作答的不变。确定继续?`}
        confirmText="一键答完"
        loading={quickPending}
        onConfirm={runQuickFill}
      />
    </div>
  );
}
