"use client";
import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createAccount, updateAccount, type AccountInput } from "../actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function Form({
  open, onOpenChange, initial, channels, onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  channels: { id: string; name: string }[];
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<AccountInput>({
    id: initial?.id,
    username: initial?.username || "",
    password: "",
    display_name: initial?.display_name || "",
    phone: initial?.phone || "",
    email: initial?.email || "",
    avatar_url: initial?.avatar_url || "",
    role: initial?.role || "admin",
    channel_id: initial?.channel_id || null,
    status: initial?.status || "active",
    remark: initial?.remark || ""
  });
  const [pending, start] = useTransition();
  const isEdit = !!initial?.id;

  useEffect(() => {
    if (open) {
      setForm({
        id: initial?.id,
        username: initial?.username || "",
        password: "",
        display_name: initial?.display_name || "",
        phone: initial?.phone || "",
        email: initial?.email || "",
        avatar_url: initial?.avatar_url || "",
        role: initial?.role || "admin",
        channel_id: initial?.channel_id || null,
        status: initial?.status || "active",
        remark: initial?.remark || ""
      });
    }
  }, [open, initial]);

  function submit() {
    if (!form.username.trim()) { toast.error("请填写用户名"); return; }
    if (!form.display_name.trim()) { toast.error("请填写显示名称"); return; }
    if (!isEdit && !form.password) { toast.error("请填写密码"); return; }
    if (form.password && form.password.length < 6) { toast.error("密码至少 6 位"); return; }
    if (form.role === "channel_admin" && !form.channel_id) {
      toast.error("渠道管理员必须选择归属渠道"); return;
    }
    start(async () => {
      try {
        if (isEdit) {
          await updateAccount(form);
        } else {
          await createAccount(form);
        }
        toast.success(isEdit ? "已更新" : "已创建");
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
          <DialogTitle>{isEdit ? "编辑账号" : "新增账号"}</DialogTitle>
          {isEdit && (
            <DialogDescription>用户名不可修改。密码留空表示不修改</DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>用户名 <span className="text-destructive">*</span></Label>
              <Input
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="登录用户名"
                disabled={isEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label>显示名称 <span className="text-destructive">*</span></Label>
              <Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} placeholder="界面显示的名字" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              密码 {!isEdit && <span className="text-destructive">*</span>}
              {isEdit && <span className="ml-1 text-xs text-muted-foreground">(留空 = 不修改)</span>}
            </Label>
            <Input
              type="password"
              value={form.password || ""}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder={isEdit ? "留空表示不修改" : "至少 6 位"}
              autoComplete="new-password"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>角色 <span className="text-destructive">*</span></Label>
              <Select
                value={form.role}
                onValueChange={(v: any) => setForm({ ...form, role: v, channel_id: v === "channel_admin" ? form.channel_id : null })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">超级管理员</SelectItem>
                  <SelectItem value="admin">平台管理员</SelectItem>
                  <SelectItem value="channel_admin">渠道管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                归属渠道 {form.role === "channel_admin" && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={form.channel_id || ""}
                onValueChange={v => setForm({ ...form, channel_id: v || null })}
                disabled={form.role !== "channel_admin"}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.role === "channel_admin" ? "请选择渠道" : "无（管理员无需）"} />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>手机</Label>
              <Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="13800138000" />
            </div>
            <div className="space-y-1.5">
              <Label>邮箱</Label>
              <Input type="email" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>头像 URL</Label>
            <Input value={form.avatar_url || ""} onChange={e => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…/avatar.png" />
          </div>

          <div className="space-y-1.5">
            <Label>备注</Label>
            <Textarea value={form.remark || ""} onChange={e => setForm({ ...form, remark: e.target.value })} rows={2} />
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
            <div>
              <div className="text-sm font-medium">状态</div>
              <div className="text-xs text-muted-foreground">停用后该账号无法登录</div>
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
