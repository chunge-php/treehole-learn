"use client";
import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RegionPicker } from "@/components/admin/RegionPicker";
import { upsertStore, type StoreInput } from "../actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function StoreForm({
  open, onOpenChange, initial, channels, role, onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  channels: { id: string; name: string }[];
  role: "super_admin" | "admin" | "channel_admin";
  onSaved?: () => void;
}) {
  const isChannelAdmin = role === "channel_admin";
  const lockedChannelId = isChannelAdmin || channels.length === 1 ? channels[0]?.id || null : null;

  const [form, setForm] = useState<StoreInput>({
    id: initial?.id,
    channel_id: initial?.channel_id || lockedChannelId,
    name: initial?.name || "",
    province: initial?.province || null,
    city: initial?.city || null,
    district: initial?.district || null,
    address: initial?.address || "",
    contact_name: initial?.contact_name || "",
    contact_phone: initial?.contact_phone || "",
    device_count: initial?.device_count ?? 0,
    status: initial?.status || "active",
    remark: initial?.remark || ""
  });
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setForm({
      id: initial?.id,
      channel_id: initial?.channel_id || lockedChannelId,
      name: initial?.name || "",
      province: initial?.province || null,
      city: initial?.city || null,
      district: initial?.district || null,
      address: initial?.address || "",
      contact_name: initial?.contact_name || "",
      contact_phone: initial?.contact_phone || "",
      device_count: initial?.device_count ?? 0,
      status: initial?.status || "active",
      remark: initial?.remark || ""
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, open]);

  function submit() {
    if (!form.name.trim()) { toast.error("请填写店铺名称"); return; }
    if (!form.channel_id && !isChannelAdmin) { toast.error("请选择所属渠道"); return; }
    start(async () => {
      try {
        await upsertStore(form);
        toast.success(initial ? "已更新" : "已创建");
        onOpenChange(false);
        onSaved?.();
      } catch (e: any) {
        toast.error(e?.message || "保存失败");
      }
    });
  }

  const channelLocked = isChannelAdmin || !!initial; // 渠道管理员或编辑时不允许换渠道

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "编辑店铺" : "新增店铺"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>店铺名称 <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例：海淀中关村学习中心" />
            </div>
            <div className="space-y-1.5">
              <Label>所属渠道 <span className="text-destructive">*</span></Label>
              <Select
                value={form.channel_id || ""}
                onValueChange={v => setForm({ ...form, channel_id: v || null })}
                disabled={channelLocked}
              >
                <SelectTrigger><SelectValue placeholder="请选择渠道" /></SelectTrigger>
                <SelectContent>
                  {channels.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>联系人</Label>
              <Input value={form.contact_name || ""} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>联系电话</Label>
              <Input value={form.contact_phone || ""} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="13800138000" />
            </div>
            <div className="space-y-1.5">
              <Label>设备数</Label>
              <Input
                type="number"
                min={0}
                value={form.device_count ?? 0}
                onChange={e => setForm({ ...form, device_count: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>备注</Label>
            <Textarea value={form.remark || ""} onChange={e => setForm({ ...form, remark: e.target.value })} rows={3} />
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
            <div>
              <div className="text-sm font-medium">状态</div>
              <div className="text-xs text-muted-foreground">停用后店铺下设备/账号无法使用</div>
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
