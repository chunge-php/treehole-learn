"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RegionPicker } from "@/components/admin/RegionPicker";
import { upsertChannel, getChannelAdmins, type ChannelInput } from "../actions";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowUpRight, User } from "lucide-react";
import { formatDateCN } from "@/lib/utils";

type FormState = ChannelInput & {
  withAdmin?: boolean;
  admin_username?: string;
  admin_password?: string;
  admin_display_name?: string;
};

const blankForm = (): FormState => ({
  id: undefined,
  name: "",
  level_id: null,
  province: null,
  city: null,
  district: null,
  address: "",
  contact_name: "",
  contact_phone: "",
  status: "active",
  remark: "",
  withAdmin: true,
  admin_username: "",
  admin_password: "",
  admin_display_name: ""
});

export function ChannelForm({
  open, onOpenChange, initial, levels, onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  levels: { id: string; name: string }[];
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<FormState>(blankForm);
  const [showPwd, setShowPwd] = useState(false);
  const [pending, start] = useTransition();
  const [linkedAdmins, setLinkedAdmins] = useState<any[]>([]);

  // 编辑时正确回填 / 切换不同行也能刷新
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        id: initial.id,
        name: initial.name || "",
        level_id: initial.level_id || null,
        province: initial.province || null,
        city: initial.city || null,
        district: initial.district || null,
        address: initial.address || "",
        contact_name: initial.contact_name || "",
        contact_phone: initial.contact_phone || "",
        status: initial.status || "active",
        remark: initial.remark || "",
        withAdmin: false,
        admin_username: "",
        admin_password: "",
        admin_display_name: ""
      });
      // 加载已关联的管理员账号
      getChannelAdmins(initial.id).then(setLinkedAdmins).catch(() => setLinkedAdmins([]));
    } else {
      setForm(blankForm());
      setLinkedAdmins([]);
    }
  }, [initial, open]);

  function submit() {
    if (!form.name.trim()) { toast.error("请填写渠道名称"); return; }
    if (!form.id && form.withAdmin) {
      if (!form.admin_username?.trim()) { toast.error("请填写管理员账号"); return; }
      if (!form.admin_password || form.admin_password.length < 6) { toast.error("管理员密码至少 6 位"); return; }
      if (!form.admin_display_name?.trim()) { toast.error("请填写管理员显示名"); return; }
    }
    start(async () => {
      try {
        const payload: ChannelInput = {
          id: form.id,
          name: form.name,
          level_id: form.level_id,
          province: form.province,
          city: form.city,
          district: form.district,
          address: form.address,
          contact_name: form.contact_name,
          contact_phone: form.contact_phone,
          status: form.status,
          remark: form.remark,
          admin_account: !form.id && form.withAdmin ? {
            username: form.admin_username!,
            password: form.admin_password!,
            display_name: form.admin_display_name!
          } : null
        };
        await upsertChannel(payload);
        toast.success(initial ? "已更新" : (form.withAdmin ? "已创建渠道与管理员账号" : "已创建"));
        onOpenChange(false);
        onSaved?.();
      } catch (e: any) {
        toast.error(e?.message || "保存失败");
      }
    });
  }

  const isEdit = !!form.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑渠道商" : "新增渠道商"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
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

          {/* === 新建模式: 同步创建管理员账号 === */}
          {!isEdit && (
            <div className="rounded-xl border border-primary/30 bg-accent/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">同步创建渠道管理员账号</span>
                </div>
                <Switch
                  checked={!!form.withAdmin}
                  onCheckedChange={c => setForm({ ...form, withAdmin: c })}
                />
              </div>
              {form.withAdmin && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>登录账号 <span className="text-destructive">*</span></Label>
                      <Input
                        value={form.admin_username || ""}
                        onChange={e => setForm({ ...form, admin_username: e.target.value })}
                        placeholder="拼音或英文"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>登录密码 <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Input
                          type={showPwd ? "text" : "password"}
                          value={form.admin_password || ""}
                          onChange={e => setForm({ ...form, admin_password: e.target.value })}
                          placeholder="至少 6 位"
                          className="pr-9"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd(s => !s)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                        >
                          {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>显示名称 <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.admin_display_name || ""}
                      onChange={e => setForm({ ...form, admin_display_name: e.target.value })}
                      placeholder="例：北京启明 - 张三"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    新账号将被自动绑定到此渠道，role = channel_admin，登录后只能看到本渠道数据。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* === 编辑模式: 已关联账号 === */}
          {isEdit && (
            <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">渠道管理员账号</span>
                  <Badge variant="muted" className="px-1.5 py-0">{linkedAdmins.length}</Badge>
                </div>
                <Link
                  href={`/settings/accounts?channel_id=${form.id}`}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10"
                  onClick={() => onOpenChange(false)}
                >
                  管理账号 <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              {linkedAdmins.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2">
                  尚未关联任何账号 — 点击右上角"管理账号"前往创建
                </div>
              ) : (
                <div className="space-y-1.5">
                  {linkedAdmins.map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-md bg-background px-2.5 py-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono">{a.username}</span>
                        <span className="text-muted-foreground">· {a.display_name}</span>
                        <Badge variant={a.status === "active" ? "success" : "muted"} className="px-1.5 py-0 text-[10px]">
                          {a.status === "active" ? "正常" : "停用"}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        上次登录 {formatDateCN(a.last_login_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
