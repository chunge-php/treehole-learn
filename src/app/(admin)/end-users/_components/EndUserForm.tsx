"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertEndUser, type EndUserInput } from "../actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type StoreOpt = { id: string; name: string; channel_id: string; channels?: { name: string } };

const GENDERS: { v: "male" | "female" | "other"; label: string }[] = [
  { v: "male", label: "男" },
  { v: "female", label: "女" },
  { v: "other", label: "其他" }
];

export function EndUserForm({
  open, onOpenChange, initial, stores, onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  stores: StoreOpt[];
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<EndUserInput>({
    id: initial?.id,
    store_id: initial?.store_id || "",
    name: initial?.name || "",
    phone: initial?.phone || "",
    gender: initial?.gender || null,
    age: initial?.age ?? null,
    grade: initial?.grade || "",
    school: initial?.school || "",
    parent_name: initial?.parent_name || "",
    parent_phone: initial?.parent_phone || "",
    paid_amount: initial?.paid_amount ?? 0,
    status: initial?.status || "active",
    remark: initial?.remark || ""
  });
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setForm({
      id: initial?.id,
      store_id: initial?.store_id || "",
      name: initial?.name || "",
      phone: initial?.phone || "",
      gender: initial?.gender || null,
      age: initial?.age ?? null,
      grade: initial?.grade || "",
      school: initial?.school || "",
      parent_name: initial?.parent_name || "",
      parent_phone: initial?.parent_phone || "",
      paid_amount: initial?.paid_amount ?? 0,
      status: initial?.status || "active",
      remark: initial?.remark || ""
    });
  }, [initial, open]);

  // 选择店铺时自动展示渠道名
  const selectedStore = useMemo(() => stores.find(st => st.id === form.store_id), [stores, form.store_id]);

  function submit() {
    if (!form.name.trim()) { toast.error("请填写姓名"); return; }
    // 店铺非必填; 渠道商角色由后端兜底校验
    start(async () => {
      try {
        await upsertEndUser(form);
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
          <DialogTitle>{initial ? "编辑普通用户" : "新增普通用户"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[64vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>姓名 <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="学生姓名" />
            </div>
            <div className="space-y-1.5">
              <Label>所属店铺</Label>
              <Select
                value={form.store_id || "__none__"}
                onValueChange={v => setForm({ ...form, store_id: v === "__none__" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="请选择店铺" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">— 暂不关联店铺</span>
                  </SelectItem>
                  {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedStore?.channels?.name ? (
                <div className="text-[11px] text-muted-foreground">归属渠道：{selectedStore.channels.name}</div>
              ) : (
                form.store_id === "" && <div className="text-[11px] text-muted-foreground">不关联店铺时也将无关联渠道（仅管理员）</div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>性别</Label>
            <div className="flex gap-2">
              {GENDERS.map(g => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setForm({ ...form, gender: form.gender === g.v ? null : g.v })}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                    form.gender === g.v
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>年龄</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={form.age ?? ""}
                onChange={e => setForm({ ...form, age: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>年级</Label>
              <Input value={form.grade || ""} onChange={e => setForm({ ...form, grade: e.target.value })} placeholder="例：五年级" />
            </div>
            <div className="space-y-1.5">
              <Label>学校</Label>
              <Input value={form.school || ""} onChange={e => setForm({ ...form, school: e.target.value })} placeholder="所在学校" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>家长姓名</Label>
              <Input value={form.parent_name || ""} onChange={e => setForm({ ...form, parent_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>家长电话</Label>
              <Input value={form.parent_phone || ""} onChange={e => setForm({ ...form, parent_phone: e.target.value })} placeholder="13800138000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>联系电话</Label>
              <Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="学生本人电话（可空）" />
            </div>
            <div className="space-y-1.5">
              <Label>付费金额</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.paid_amount ?? 0}
                onChange={e => setForm({ ...form, paid_amount: Number(e.target.value) || 0 })}
              />
            </div>
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
