"use client";
import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { upsertChannelLevel, type ChannelLevelInput } from "../actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

  useEffect(() => {
    if (open) {
      setForm({
        id: initial?.id,
        name: initial?.name || "",
        rank: initial?.rank ?? 0,
        remark: initial?.remark || ""
      });
    }
  }, [open, initial]);

  function submit() {
    if (!form.name.trim()) { toast.error("请填写名称"); return; }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "编辑渠道级别" : "新增渠道级别"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>级别名称 <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例：金牌 / 银牌 / VIP" />
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
