"use client";
import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { upsertTopType, type TopTypeInput, type TopTypeNode } from "../actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ROOT_VALUE = "__root__";

export function Form({
  open, onOpenChange, initial, defaultParentId, parents, onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: TopTypeNode | null;
  defaultParentId?: string | null;
  parents: { id: string; name: string }[];
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<TopTypeInput>({
    id: initial?.id,
    parent_id: initial?.parent_id ?? defaultParentId ?? null,
    name: initial?.name || "",
    cover_url: initial?.cover_url || "",
    selected_icon_url: initial?.selected_icon_url || "",
    unselected_icon_url: initial?.unselected_icon_url || "",
    sort_order: initial?.sort_order ?? 0,
    status: initial?.status || "active"
  });
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) {
      setForm({
        id: initial?.id,
        parent_id: initial?.parent_id ?? defaultParentId ?? null,
        name: initial?.name || "",
        cover_url: initial?.cover_url || "",
        selected_icon_url: initial?.selected_icon_url || "",
        unselected_icon_url: initial?.unselected_icon_url || "",
        sort_order: initial?.sort_order ?? 0,
        status: initial?.status || "active"
      });
    }
  }, [open, initial, defaultParentId]);

  const isChild = !!form.parent_id;

  function submit() {
    if (!form.name.trim()) { toast.error("请填写名称"); return; }
    start(async () => {
      try {
        await upsertTopType(form);
        toast.success(initial ? "已更新" : "已创建");
        onOpenChange(false);
        onSaved?.();
      } catch (e: any) {
        toast.error(e?.message || "保存失败");
      }
    });
  }

  // 编辑一级时不允许在父级里选自己
  const parentOptions = parents.filter(p => p.id !== initial?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "编辑类型" : isChild ? "新增子类型" : "新增一级类型"}</DialogTitle>
          <DialogDescription>
            {isChild ? "二级子类型需配置选中 / 未选中图标" : "一级类型需配置封面图，在 App 顶部展示"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>名称 <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="类型名称" />
            </div>
            <div className="space-y-1.5">
              <Label>父级</Label>
              <Select
                value={form.parent_id || ROOT_VALUE}
                onValueChange={v => setForm({ ...form, parent_id: v === ROOT_VALUE ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT_VALUE}>（无 / 一级类型）</SelectItem>
                  {parentOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isChild && (
            <div className="space-y-1.5">
              <Label>封面图 URL</Label>
              <Input
                value={form.cover_url || ""}
                onChange={e => setForm({ ...form, cover_url: e.target.value })}
                placeholder="https://…/cover.png"
              />
              {form.cover_url && (
                <div className="mt-1.5 flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.cover_url} alt="封面" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          )}

          {isChild && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>未选中图标 URL</Label>
                <Input
                  value={form.unselected_icon_url || ""}
                  onChange={e => setForm({ ...form, unselected_icon_url: e.target.value })}
                  placeholder="https://…/icon-off.png"
                />
                {form.unselected_icon_url && (
                  <div className="mt-1.5 flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.unselected_icon_url} alt="未选中" className="h-full w-full object-contain" />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>选中图标 URL</Label>
                <Input
                  value={form.selected_icon_url || ""}
                  onChange={e => setForm({ ...form, selected_icon_url: e.target.value })}
                  placeholder="https://…/icon-on.png"
                />
                {form.selected_icon_url && (
                  <div className="mt-1.5 flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border bg-card ring-2 ring-primary/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.selected_icon_url} alt="选中" className="h-full w-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>排序</Label>
              <Input
                type="number"
                value={form.sort_order ?? 0}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                placeholder="数字越小越靠前"
              />
            </div>
            <div className="flex items-end">
              <div className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                <div>
                  <div className="text-sm font-medium">状态</div>
                  <div className="text-xs text-muted-foreground">停用后端不再返回</div>
                </div>
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
