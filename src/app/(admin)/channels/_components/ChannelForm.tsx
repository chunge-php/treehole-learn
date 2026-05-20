"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RegionPicker } from "@/components/admin/RegionPicker";
import { upsertChannel, type ChannelInput } from "../actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function ChannelForm({
  open, onOpenChange, initial, levels, onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  levels: { id: string; name: string }[];
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<ChannelInput>({
    id: initial?.id,
    name: initial?.name || "",
    level_id: initial?.level_id || null,
    province: initial?.province || null,
    city: initial?.city || null,
    district: initial?.district || null,
    address: initial?.address || "",
    contact_name: initial?.contact_name || "",
    contact_phone: initial?.contact_phone || "",
    status: initial?.status || "active",
    remark: initial?.remark || ""
  });
  const [pending, start] = useTransition();

  function submit() {
    if (!form.name.trim()) { toast.error("请填写渠道名称"); return; }
    start(async () => {
      try {
        await upsertChannel(form);
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "编辑渠道商" : "新增渠道商"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>渠道名称 <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例：北京启明渠道商" />
            </div>
            <div className="space-y-1.5">
              <Label>渠道级别</Label>
              <Select value={form.level_id || ""} onValueChange={v => setForm({ ...form, level_id: v || null })}>
                <SelectTrigger><SelectValue placeholder="未指定" /></SelectTrigger>
                <SelectContent>
                  {levels.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>归属地区</Label>
            <RegionPicker
              value={{ province: form.province, city: form.city, district: form.district }}
              onChange={v => setForm({ ...form, ...v })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>详细地址</Label>
            <Input value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="街道、门牌号等" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>联系人</Label>
              <Input value={form.contact_name || ""} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>联系电话</Label>
              <Input value={form.contact_phone || ""} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="13800138000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>备注</Label>
            <Textarea value={form.remark || ""} onChange={e => setForm({ ...form, remark: e.target.value })} rows={3} />
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
            <div>
              <div className="text-sm font-medium">状态</div>
              <div className="text-xs text-muted-foreground">停用后渠道商账号无法登录</div>
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
