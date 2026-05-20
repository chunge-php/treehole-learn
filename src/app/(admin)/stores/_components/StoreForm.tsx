"use client";
import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { RegionPicker } from "@/components/admin/RegionPicker";
import { upsertStore, checkStoreNameAvailable, type StoreInput } from "../actions";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type NameCheck = { status: "idle" | "checking" | "available" | "taken"; reason?: string };

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
  const [nameCheck, setNameCheck] = useState<NameCheck>({ status: "idle" });

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
    setNameCheck({ status: "idle" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, open]);

  // 实时校验店铺名 + 渠道唯一性 (300ms debounce)
  useEffect(() => {
    if (!open) return;
    const n = (form.name || "").trim();
    const ch = form.channel_id || null;
    // 编辑且未变更
    if (initial && n === (initial.name || "") && ch === (initial.channel_id || null)) {
      setNameCheck({ status: "idle" });
      return;
    }
    if (!n) { setNameCheck({ status: "idle" }); return; }
    setNameCheck({ status: "checking" });
    const t = setTimeout(async () => {
      try {
        const r = await checkStoreNameAvailable(n, ch, initial?.id);
        if (r.ok) setNameCheck({ status: "available" });
        else setNameCheck({ status: "taken", reason: r.reason });
      } catch {
        setNameCheck({ status: "idle" });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [form.name, form.channel_id, open, initial]);

  function submit() {
    if (!form.name.trim()) { toast.error("请填写店铺名称"); return; }
    if (nameCheck.status === "checking") { toast.error("名称校验中，请稍候…"); return; }
    if (nameCheck.status === "taken") { toast.error(nameCheck.reason || "店铺名称冲突"); return; }
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
  const showHint = (form.name || "").trim().length > 0 && nameCheck.status !== "idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "编辑店铺" : "新增店铺"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>店铺名称 <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="例：海淀中关村学习中心"
                  className={cn(
                    "pr-9",
                    nameCheck.status === "taken" && "border-destructive focus-visible:ring-destructive",
                    nameCheck.status === "available" && "border-success focus-visible:ring-success"
                  )}
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
                  {nameCheck.status === "taken" && (nameCheck.reason || "已存在同名店铺")}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>所属渠道 {isChannelAdmin && <span className="text-destructive">*</span>}</Label>
              <Combobox
                options={[
                  ...(!isChannelAdmin ? [{ value: "__none__", label: "— 暂不关联渠道" }] : []),
                  ...channels.map(c => ({ value: c.id, label: c.name }))
                ]}
                value={form.channel_id || (isChannelAdmin ? "" : "__none__")}
                onChange={v => setForm({ ...form, channel_id: (!v || v === "__none__") ? null : v })}
                placeholder="请选择渠道"
                searchPlaceholder="搜索渠道名…"
                emptyText="无匹配渠道"
                disabled={channelLocked}
              />
              {!channelLocked && (
                <p className="text-[11px] text-muted-foreground">
                  切换渠道时会重新检查名称
                </p>
              )}
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
