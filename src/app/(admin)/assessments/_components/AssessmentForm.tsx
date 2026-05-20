"use client";
import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UploadField } from "@/components/admin/UploadField";
import { MultiUploadField, type MediaItem } from "@/components/admin/MultiUploadField";
import {
  upsertAssessment,
  checkAssessmentSortOrderAvailable,
  nextAssessmentSortOrder,
  type AssessmentInput,
  type AssessmentOption
} from "../actions";
import { DIMENSIONS, QTYPES, type AssessmentDimension, type AssessmentQType } from "./constants";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SortCheck = { status: "idle" | "checking" | "available" | "taken"; reason?: string };

function nextLetter(idx: number) {
  return String.fromCharCode(65 + idx);
}

export function AssessmentForm({
  open, onOpenChange, initial, projectSuggestions = [], onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  projectSuggestions?: string[];
  onSaved?: () => void;
}) {
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<AssessmentInput>({
    id: initial?.id,
    title: initial?.title || "",
    description: initial?.description || "",
    cover_url: initial?.cover_url || "",
    media_urls: Array.isArray(initial?.media_urls) ? initial.media_urls : [],
    project_name: initial?.project_name || "",
    dimension: (initial?.dimension as AssessmentDimension) || "自陈量表",
    qtype: (initial?.qtype as AssessmentQType) || "单选题",
    options: Array.isArray(initial?.options) && initial.options.length
      ? initial.options
      : [{ label: "", value: "A" }, { label: "", value: "B" }],
    answer: initial?.answer || "",
    sort_order: initial?.sort_order ?? 0,
    status: initial?.status || "active"
  });
  const [pending, start] = useTransition();
  const [sortCheck, setSortCheck] = useState<SortCheck>({ status: "idle" });

  // 创建模式: 拉取下一个可用序号
  useEffect(() => {
    if (!open || isEdit) return;
    nextAssessmentSortOrder().then(n => setForm(f => ({ ...f, sort_order: n }))).catch(() => {});
  }, [open, isEdit]);

  // 切换 initial 或 open 时重置
  useEffect(() => {
    if (!open) return;
    setForm({
      id: initial?.id,
      title: initial?.title || "",
      description: initial?.description || "",
      cover_url: initial?.cover_url || "",
      media_urls: Array.isArray(initial?.media_urls) ? initial.media_urls : [],
      project_name: initial?.project_name || "",
      dimension: (initial?.dimension as AssessmentDimension) || "自陈量表",
      qtype: (initial?.qtype as AssessmentQType) || "单选题",
      options: Array.isArray(initial?.options) && initial.options.length
        ? initial.options
        : [{ label: "", value: "A" }, { label: "", value: "B" }],
      answer: initial?.answer || "",
      sort_order: initial?.sort_order ?? 0,
      status: initial?.status || "active"
    });
    setSortCheck({ status: "idle" });
  }, [initial, open]);

  // 序号实时校验
  useEffect(() => {
    if (!open) return;
    const n = form.sort_order;
    if (isEdit && n === (initial?.sort_order ?? -999)) { setSortCheck({ status: "idle" }); return; }
    if (!Number.isInteger(n) || n < 0) { setSortCheck({ status: "taken", reason: "需 ≥ 0 整数" }); return; }
    setSortCheck({ status: "checking" });
    const t = setTimeout(async () => {
      try {
        const r = await checkAssessmentSortOrderAvailable(n, initial?.id);
        if (r.ok) setSortCheck({ status: "available" });
        else setSortCheck({ status: "taken", reason: r.reason });
      } catch { setSortCheck({ status: "idle" }); }
    }, 300);
    return () => clearTimeout(t);
  }, [form.sort_order, open, isEdit, initial?.sort_order, initial?.id]);

  // 选项编辑
  function setOption(idx: number, patch: Partial<AssessmentOption>) {
    const next = [...(form.options || [])];
    next[idx] = { ...next[idx], ...patch };
    setForm({ ...form, options: next });
  }
  function addOption() {
    const next = [...(form.options || [])];
    next.push({ label: "", value: nextLetter(next.length) });
    setForm({ ...form, options: next });
  }
  function removeOption(idx: number) {
    const next = (form.options || []).filter((_, i) => i !== idx);
    setForm({ ...form, options: next });
  }

  function submit() {
    if (!form.title.trim()) { toast.error("请填写题目标题"); return; }
    if (sortCheck.status === "checking") { toast.error("序号校验中…"); return; }
    if (sortCheck.status === "taken") { toast.error(sortCheck.reason || "序号冲突"); return; }
    start(async () => {
      try {
        await upsertAssessment(form);
        toast.success(isEdit ? "已更新" : "已创建");
        onOpenChange(false);
        onSaved?.();
      } catch (e: any) {
        toast.error(e?.message || "保存失败");
      }
    });
  }

  // 判断题: 选项固定为 是 / 否
  function applyTrueFalse() {
    setForm(f => ({ ...f, options: [{ label: "是", value: "T" }, { label: "否", value: "F" }] }));
  }

  const showSortHint = sortCheck.status !== "idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑测评题" : "新增测评题"}</DialogTitle>
          <DialogDescription>
            维度 + 题型决定题目展示形式; 序号决定全局顺序 (全局唯一)
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
          {/* 标题 + 描述 */}
          <div className="space-y-1.5">
            <Label>题目标题 <span className="text-destructive">*</span></Label>
            <Input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="例: 当你遇到一道难题时, 你通常会..."
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>描述</Label>
            <Textarea
              value={form.description || ""}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="题目背景 / 答题指引 (可选)"
            />
          </div>

          {/* 封面 */}
          <div className="space-y-1.5">
            <Label>封面</Label>
            <UploadField
              value={form.cover_url}
              onChange={v => setForm({ ...form, cover_url: v })}
              accept="image/*"
              prefix="cover"
              placeholder="封面图 URL 或点击上传"
            />
          </div>

          {/* 维度 + 题型 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>所属维度 <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-2 gap-2">
                {DIMENSIONS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm({ ...form, dimension: d })}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs text-left transition-colors",
                      form.dimension === d
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-input bg-background hover:bg-accent"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>题目类型 <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                {QTYPES.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      const isSpeech = q === "语音题";
                      setForm({
                        ...form,
                        qtype: q,
                        // 语音题: 清空选项与答案
                        options: isSpeech ? [] : (form.options?.length ? form.options : [{ label: "", value: "A" }, { label: "", value: "B" }]),
                        answer: isSpeech ? "" : form.answer
                      });
                      if (q === "判断题") applyTrueFalse();
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs text-center transition-colors",
                      form.qtype === q
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-input bg-background hover:bg-accent"
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 题目文件 */}
          <div className="space-y-1.5">
            <Label>题目文件</Label>
            <MultiUploadField
              value={form.media_urls || []}
              onChange={v => setForm({ ...form, media_urls: v as MediaItem[] })}
              accept="image/*,video/*"
              prefix="media"
            />
            <p className="text-[11px] text-muted-foreground">支持图片/视频, 多选; 单文件 ≤ 50MB</p>
          </div>

          {/* 语音题占位提示 */}
          {form.qtype === "语音题" && (
            <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              语音题: 学员通过录音作答, 无需配置选项与答案。题目文件可上传引导音/示范音。
            </div>
          )}

          {/* 题目内容 (选项) - 仅非语音题 */}
          {form.qtype !== "语音题" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>题目内容 (选项)</Label>
                {form.qtype === "单选题" && (
                  <Button type="button" variant="ghost" size="sm" onClick={addOption} className="h-7 text-xs">
                    <Plus className="h-3 w-3" /> 添加选项
                  </Button>
                )}
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                {(form.options || []).map((o, idx) => {
                  const v = o.value || nextLetter(idx);
                  const isAnswer = form.answer === v;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors",
                        isAnswer && "bg-success/10 ring-1 ring-success/30"
                      )}
                    >
                      <input
                        type="radio"
                        name="th-correct-answer"
                        checked={isAnswer}
                        onChange={() => setForm({ ...form, answer: v })}
                        className="h-3.5 w-3.5 accent-success cursor-pointer"
                        title="标记为正确答案"
                      />
                      <Badge
                        variant={isAnswer ? "success" : "outline"}
                        className="font-mono w-8 justify-center shrink-0"
                      >{v}</Badge>
                      <Input
                        value={o.label}
                        onChange={e => setOption(idx, { label: e.target.value })}
                        placeholder={`选项 ${v} 内容`}
                        className="flex-1 h-8"
                      />
                      {form.qtype === "单选题" && (form.options?.length || 0) > 2 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(idx)} className="h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
                {form.qtype === "判断题" && (
                  <p className="text-[11px] text-muted-foreground">勾选左侧圆点标记正确答案</p>
                )}
                {form.qtype === "单选题" && !form.answer && (
                  <p className="text-[11px] text-muted-foreground">点击选项左侧圆点标记一个为正确答案 (量表题可不选)</p>
                )}
              </div>
            </div>
          )}

          {/* 所属项目 + 序号 + 状态 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>所属项目</Label>
              <Input
                value={form.project_name || ""}
                onChange={e => setForm({ ...form, project_name: e.target.value })}
                placeholder="手动输入项目名"
                list="th-project-suggestions"
              />
              {projectSuggestions.length > 0 && (
                <datalist id="th-project-suggestions">
                  {projectSuggestions.map(p => <option key={p} value={p} />)}
                </datalist>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>序号 <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.sort_order}
                  onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className={cn(
                    "pr-9",
                    sortCheck.status === "taken" && "border-destructive focus-visible:ring-destructive",
                    sortCheck.status === "available" && "border-success focus-visible:ring-success"
                  )}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {sortCheck.status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {sortCheck.status === "available" && <CheckCircle2 className="h-4 w-4 text-success" />}
                  {sortCheck.status === "taken" && <AlertCircle className="h-4 w-4 text-destructive" />}
                </div>
              </div>
              {showSortHint && (
                <p className={cn(
                  "text-[11px]",
                  sortCheck.status === "checking" && "text-muted-foreground",
                  sortCheck.status === "available" && "text-success",
                  sortCheck.status === "taken" && "text-destructive"
                )}>
                  {sortCheck.status === "checking" && "正在检查序号是否被占用…"}
                  {sortCheck.status === "available" && "序号可用"}
                  {sortCheck.status === "taken" && (sortCheck.reason || "序号已被占用")}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>启用状态</Label>
              <div className="flex items-center justify-between h-9 rounded-lg border bg-muted/30 px-3">
                <span className="text-sm">{form.status === "active" ? "已启用" : "已停用"}</span>
                <Switch
                  checked={form.status === "active"}
                  onCheckedChange={c => setForm({ ...form, status: c ? "active" : "disabled" })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            保 存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
