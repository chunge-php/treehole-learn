"use client";
import { useEffect, useState, useTransition, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { upsertAssessment, type AssessmentInput, type AssessmentOption } from "../actions";
import { DIMENSION_LABEL, QTYPE_LABEL, type AssessmentDimension, type AssessmentQType } from "./constants";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

function nextLetter(idx: number) {
  return String.fromCharCode(65 + idx);
}

export function AssessmentForm({
  open, onOpenChange, initial, projects, onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  projects: { id: string; name: string }[];
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<AssessmentInput>({
    id: initial?.id,
    project_id: initial?.project_id || null,
    dimension: (initial?.dimension as AssessmentDimension) || "learning_attitude",
    qtype: (initial?.qtype as AssessmentQType) || "single",
    title: initial?.title || "",
    options: Array.isArray(initial?.options) && initial.options.length
      ? initial.options
      : [
          { label: "", value: "A" },
          { label: "", value: "B" }
        ],
    answer: initial?.answer ?? (initial?.qtype === "multiple" ? [] : ""),
    explanation: initial?.explanation || "",
    score: initial?.score ?? null,
    sort_order: initial?.sort_order ?? 0,
    status: initial?.status || "active"
  });
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setForm({
      id: initial?.id,
      project_id: initial?.project_id || null,
      dimension: (initial?.dimension as AssessmentDimension) || "learning_attitude",
      qtype: (initial?.qtype as AssessmentQType) || "single",
      title: initial?.title || "",
      options: Array.isArray(initial?.options) && initial.options.length
        ? initial.options
        : [
            { label: "", value: "A" },
            { label: "", value: "B" }
          ],
      answer: initial?.answer ?? (initial?.qtype === "multiple" ? [] : ""),
      explanation: initial?.explanation || "",
      score: initial?.score ?? null,
      sort_order: initial?.sort_order ?? 0,
      status: initial?.status || "active"
    });
  }, [initial, open]);

  const options = useMemo(() => form.options || [], [form.options]);

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
    let answer = form.answer;
    if (form.qtype === "multiple" && Array.isArray(answer)) {
      const removedVal = (form.options || [])[idx]?.value;
      answer = answer.filter((v: string) => v !== removedVal);
    } else if (form.qtype === "single") {
      const removedVal = (form.options || [])[idx]?.value;
      if (answer === removedVal) answer = "";
    }
    setForm({ ...form, options: next, answer });
  }

  function changeQType(v: AssessmentQType) {
    if (v === "text") {
      setForm({ ...form, qtype: v, answer: typeof form.answer === "string" ? form.answer : "" });
    } else if (v === "multiple") {
      const arr = Array.isArray(form.answer) ? form.answer : (form.answer ? [form.answer] : []);
      setForm({ ...form, qtype: v, answer: arr });
    } else {
      const single = Array.isArray(form.answer) ? (form.answer[0] || "") : (form.answer || "");
      setForm({ ...form, qtype: v, answer: single });
    }
  }

  function toggleMultiAnswer(value: string, checked: boolean) {
    const cur: string[] = Array.isArray(form.answer) ? [...form.answer] : [];
    if (checked) {
      if (!cur.includes(value)) cur.push(value);
    } else {
      const idx = cur.indexOf(value);
      if (idx >= 0) cur.splice(idx, 1);
    }
    setForm({ ...form, answer: cur });
  }

  function submit() {
    if (!form.title.trim()) { toast.error("请填写题目"); return; }
    if (form.qtype !== "text") {
      const validOpts = (form.options || []).filter(o => o.label.trim());
      if (validOpts.length < 2) { toast.error("至少添加 2 个有效选项"); return; }
    }
    start(async () => {
      try {
        await upsertAssessment(form);
        toast.success(initial ? "已更新" : "已创建");
        onOpenChange(false);
        onSaved?.();
      } catch (e: any) {
        toast.error(e?.message || "保存失败");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "编辑测评题" : "新增测评题"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>维度 <span className="text-destructive">*</span></Label>
              <Select value={form.dimension} onValueChange={v => setForm({ ...form, dimension: v as AssessmentDimension })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DIMENSION_LABEL) as AssessmentDimension[]).map(k => (
                    <SelectItem key={k} value={k}>{DIMENSION_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>题型 <span className="text-destructive">*</span></Label>
              <Select value={form.qtype} onValueChange={v => changeQType(v as AssessmentQType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">{QTYPE_LABEL.single}</SelectItem>
                  <SelectItem value="multiple">{QTYPE_LABEL.multiple}</SelectItem>
                  <SelectItem value="text">{QTYPE_LABEL.text}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>所属项目</Label>
              <Select value={form.project_id || "__none"} onValueChange={v => setForm({ ...form, project_id: v === "__none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="未指定" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">未指定</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>题目 <span className="text-destructive">*</span></Label>
            <Textarea
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              rows={2}
              placeholder="请输入题干内容"
            />
          </div>

          {form.qtype !== "text" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>选项 <span className="text-destructive">*</span></Label>
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="h-3.5 w-3.5" /> 添加选项
                </Button>
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                {options.map((opt, idx) => {
                  const checked = form.qtype === "single"
                    ? form.answer === opt.value
                    : Array.isArray(form.answer) && form.answer.includes(opt.value);
                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex h-9 items-center">
                        {form.qtype === "single" ? (
                          <input
                            type="radio"
                            name="answer-single"
                            checked={!!checked}
                            onChange={() => setForm({ ...form, answer: opt.value })}
                            className="h-4 w-4 accent-primary"
                          />
                        ) : (
                          <Checkbox
                            checked={!!checked}
                            onCheckedChange={c => toggleMultiAnswer(opt.value, !!c)}
                          />
                        )}
                      </div>
                      <div className="w-12 shrink-0">
                        <Input
                          value={opt.value}
                          onChange={e => setOption(idx, { value: e.target.value })}
                          className="h-9 text-center font-mono"
                        />
                      </div>
                      <Input
                        value={opt.label}
                        onChange={e => setOption(idx, { label: e.target.value })}
                        placeholder={`选项 ${opt.value || nextLetter(idx)} 内容`}
                        className="h-9 flex-1"
                      />
                      <Input
                        type="number"
                        value={opt.score ?? ""}
                        onChange={e => setOption(idx, { score: e.target.value === "" ? undefined : Number(e.target.value) })}
                        placeholder="分值"
                        className="h-9 w-20"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(idx)}
                        disabled={options.length <= 2}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
                <p className="text-[11px] text-muted-foreground">
                  勾选/单选项前的圆点或方框，标记本题{form.qtype === "single" ? "唯一正确答案" : "所有正确答案"}。分值可留空。
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>参考答案</Label>
              <Textarea
                value={typeof form.answer === "string" ? form.answer : ""}
                onChange={e => setForm({ ...form, answer: e.target.value })}
                rows={3}
                placeholder="简答题的参考答案，仅作评阅参考"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>题目解析</Label>
            <Textarea
              value={form.explanation || ""}
              onChange={e => setForm({ ...form, explanation: e.target.value })}
              rows={2}
              placeholder="向学生展示的答题解析（可选）"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>总分值</Label>
              <Input
                type="number"
                value={form.score ?? ""}
                onChange={e => setForm({ ...form, score: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="例：5"
              />
            </div>
            <div className="space-y-1.5">
              <Label>排序</Label>
              <Input
                type="number"
                value={form.sort_order ?? 0}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
            <div>
              <div className="text-sm font-medium">启用状态</div>
              <div className="text-xs text-muted-foreground">停用后该题不会出现在新发起的测评中</div>
            </div>
            <Switch
              checked={form.status === "active"}
              onCheckedChange={c => setForm({ ...form, status: c ? "active" : "disabled" })}
            />
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
