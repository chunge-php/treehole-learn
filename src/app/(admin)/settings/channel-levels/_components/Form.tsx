"use client";
import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { upsertChannelLevel, checkChannelLevelNameAvailable, type ChannelLevelInput } from "../actions";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type NameCheck = { status: "idle" | "checking" | "available" | "taken"; reason?: string };

export function Form({
  open, onOpenChange, initial, onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<ChannelLevelInput>({
    id: initial?.id,
    name: initial?.name || "",
    rank: initial?.rank ?? 0,
    remark: initial?.remark || ""
  });
  const [pending, start] = useTransition();
  const [nameCheck, setNameCheck] = useState<NameCheck>({ status: "idle" });

  useEffect(() => {
    if (open) {
      setForm({
        id: initial?.id,
        name: initial?.name || "",
        rank: initial?.rank ?? 0,
        remark: initial?.remark || ""
      });
      setNameCheck({ status: "idle" });
    }
  }, [open, initial]);

  // 名称实时去重检查 (300ms debounce)
  useEffect(() => {
    if (!open) return;
    const n = (form.name || "").trim();
    if (initial && n === (initial.name || "")) { setNameCheck({ status: "idle" }); return; }
    if (!n) { setNameCheck({ status: "idle" }); return; }
    setNameCheck({ status: "checking" });
    const t = setTimeout(async () => {
      try {
        const r = await checkChannelLevelNameAvailable(n, initial?.id);
        if (r.ok) setNameCheck({ status: "available" });
        else setNameCheck({ status: "taken", reason: r.reason });
      } catch { setNameCheck({ status: "idle" }); }
    }, 300);
    return () => clearTimeout(t);
  }, [form.name, open, initial]);

  function submit() {
    if (!form.name.trim()) { toast.error("请填写名称"); return; }
    if (nameCheck.status === "checking") { toast.error("名称校验中, 请稍候…"); return; }
    if (nameCheck.status === "taken") { toast.error(nameCheck.reason || "名称已存在"); return; }
    start(async () => {
      try {
        await upsertChannelLevel(form);
        toast.success(initial ? "已更新" : "已创建");
        onOpenChange(false);
        onSaved?.();
      } catch (e: any) {
        toast.error(e?.message || "保存失败");
      }
    });
  }

  const showHint = (form.name || "").trim().length > 0 && nameCheck.status !== "idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "编辑渠道级别" : "新增渠道级别"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>级别名称 <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="例：金牌 / 银牌 / VIP"
                className={cn(
                  "pr-9",
                  nameCheck.status === "taken" && "border-destructive focus-visible:ring-destructive",
                  nameCheck.status === "available" && "border-success focus-visible:ring-success"
                )}
                autoFocus
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {nameCheck.status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {nameCheck.status === "available" && <CheckCircle2 className="h-4 w-4 text-success" />}
                {nameCheck.status === "taken" && <AlertCircle className="h-4 w-4 text-destructive" />}
              </div>
            </div>
            {showHint && (
              <p className={cn(
                "text-[11px]",
                nameCheck.status === "checking" && "text-muted-foreground",
                nameCheck.status === "available" && "text-success",
                nameCheck.status === "taken" && "text-destructive"
              )}>
                {nameCheck.status === "checking" && "正在检查名称是否可用…"}
                {nameCheck.status === "available" && "名称可用"}
                {nameCheck.status === "taken" && (nameCheck.reason || "已存在同名级别")}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>排序</Label>
            <Input
              type="number"
              value={form.rank ?? 0}
              onChange={e => setForm({ ...form, rank: Number(e.target.value) || 0 })}
              placeholder="数字越小越靠前"
            />
          </div>
          <div className="space-y-1.5">
            <Label>备注</Label>
            <Textarea value={form.remark || ""} onChange={e => setForm({ ...form, remark: e.target.value })} rows={3} />
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
