"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { upsertEndUser, checkEndUserUsernameAvailable, resetEndUserPassword, listChannelsForSelect, type EndUserInput } from "../actions";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound, User, Building2, Store, Phone, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type StoreOpt = { id: string; name: string; channel_id: string; channels?: { name: string } };
type ChannelOpt = { id: string; name: string };
type NameCheck = { status: "idle" | "checking" | "available" | "taken"; reason?: string };

export function EndUserForm({
  open, onOpenChange, initial, stores, onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  stores: StoreOpt[];
  onSaved?: () => void;
}) {
  const isEdit = !!initial?.id;

  const [channels, setChannels] = useState<ChannelOpt[]>([]);
  const [channelId, setChannelId] = useState<string | null>(initial?.channel_id || null);
  const [form, setForm] = useState<EndUserInput>({
    id: initial?.id,
    store_id: initial?.store_id || null,
    channel_id: initial?.channel_id || null,
    name: initial?.name || "",
    phone: initial?.phone || "",
    login_username: initial?.login_username || "",
    login_password: "",
    // 编辑回填其它字段
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
  const [showPwd, setShowPwd] = useState(false);
  const [pending, start] = useTransition();
  const [usernameCheck, setUsernameCheck] = useState<NameCheck>({ status: "idle" });
  const [resetMode, setResetMode] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [resetPending, startReset] = useTransition();

  // 拉取渠道列表 (admin 模式可选, channel_admin 锁定)
  useEffect(() => {
    if (!open) return;
    listChannelsForSelect().then(setChannels).catch(() => setChannels([]));
  }, [open]);

  // 打开/切换 initial 时重置
  useEffect(() => {
    if (!open) return;
    setChannelId(initial?.channel_id || null);
    setForm({
      id: initial?.id,
      store_id: initial?.store_id || null,
      channel_id: initial?.channel_id || null,
      name: initial?.name || "",
      phone: initial?.phone || "",
      login_username: initial?.login_username || "",
      login_password: "",
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
    setUsernameCheck({ status: "idle" });
    setResetMode(false);
    setNewPwd("");
  }, [initial, open]);

  // 当渠道变化时, 过滤店铺并自动清空已选店铺(若不属于新渠道)
  const storesInChannel = useMemo(() => {
    if (!channelId) return stores;
    return stores.filter(s => s.channel_id === channelId);
  }, [stores, channelId]);

  useEffect(() => {
    // 切换渠道后, 若当前 store_id 不在新渠道下, 清空
    if (form.store_id) {
      const inList = storesInChannel.find(s => s.id === form.store_id);
      if (!inList) setForm(f => ({ ...f, store_id: null }));
    }
  }, [channelId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 登录账号实时校验
  useEffect(() => {
    if (!open) return;
    const u = (form.login_username || "").trim();
    if (isEdit && u === (initial?.login_username || "")) { setUsernameCheck({ status: "idle" }); return; }
    if (!u) { setUsernameCheck({ status: "idle" }); return; }
    setUsernameCheck({ status: "checking" });
    const t = setTimeout(async () => {
      try {
        const r = await checkEndUserUsernameAvailable(u, initial?.id);
        if (r.ok) setUsernameCheck({ status: "available" });
        else setUsernameCheck({ status: "taken", reason: r.reason });
      } catch { setUsernameCheck({ status: "idle" }); }
    }, 300);
    return () => clearTimeout(t);
  }, [form.login_username, open, isEdit, initial?.login_username, initial?.id]);

  function submit() {
    if (!form.name.trim()) { toast.error("请填写姓名"); return; }
    if (usernameCheck.status === "checking") { toast.error("登录账号校验中…"); return; }
    if (usernameCheck.status === "taken") { toast.error(usernameCheck.reason || "登录账号冲突"); return; }
    if (!isEdit && (form.login_username || "").trim() && !(form.login_password || "").trim()) {
      toast.error("设置了登录账号必须同时填写登录密码"); return;
    }
    if (form.login_password && form.login_password.length > 0 && form.login_password.length < 6) {
      toast.error("登录密码至少 6 位"); return;
    }
    start(async () => {
      try {
        await upsertEndUser({ ...form, channel_id: channelId });
        toast.success(isEdit ? "已更新" : "已创建");
        onOpenChange(false);
        onSaved?.();
      } catch (e: any) { toast.error(e?.message || "保存失败"); }
    });
  }

  function submitResetPwd() {
    if (!newPwd || newPwd.length < 6) { toast.error("密码至少 6 位"); return; }
    if (!initial?.id) return;
    startReset(async () => {
      try {
        await resetEndUserPassword(initial.id, newPwd);
        toast.success("密码已重置");
        setResetMode(false); setNewPwd("");
      } catch (e: any) { toast.error(e?.message || "重置失败"); }
    });
  }

  const showUsernameHint = (form.login_username || "").trim().length > 0 && usernameCheck.status !== "idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑普通用户" : "新增普通用户"}</DialogTitle>
          <DialogDescription>
            创建后该账号可登录小程序 / 平板端做测评。一个普通用户 = 一个学员档案 + 登录凭证。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
          {/* 1. 归属渠道 */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /> 归属渠道</Label>
            <Combobox
              options={channels.map(c => ({ value: c.id, label: c.name }))}
              value={channelId}
              onChange={v => setChannelId(v)}
              placeholder="选择渠道 (admin 可留空)"
              searchPlaceholder="搜索渠道名…"
              emptyText="无匹配渠道"
              clearable
            />
          </div>

          {/* 2. 归属店铺 (与渠道联动) */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Store className="h-3.5 w-3.5 text-muted-foreground" /> 归属店铺</Label>
            <Combobox
              // key 绑定 channelId, 切换渠道时强制重新挂载 Combobox, 清空内部搜索词
              key={`store-${channelId || "all"}`}
              options={storesInChannel.map(s => ({
                value: s.id,
                label: s.name,
                hint: !channelId ? s.channels?.name : undefined
              }))}
              value={form.store_id || null}
              onChange={v => setForm({ ...form, store_id: v })}
              placeholder={
                channelId
                  ? `请选择「${channels.find(c => c.id === channelId)?.name || ""}」下的店铺`
                  : "请先选择渠道 (或留空创建无关联用户)"
              }
              searchPlaceholder="搜索店铺名…"
              emptyText={channelId ? "该渠道下暂无店铺" : "暂无店铺"}
              clearable
            />
            {channelId ? (
              <p className="text-[11px] text-primary flex items-center gap-1">
                <Store className="h-3 w-3" />
                已联动: 仅显示「{channels.find(c => c.id === channelId)?.name}」下的 <span className="font-semibold tabular-nums">{storesInChannel.length}</span> 家店铺
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                未选择渠道时显示全部 {stores.length} 家店铺 (右侧灰字为所属渠道)
              </p>
            )}
          </div>

          {/* 3. 姓名 + 关联手机号 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" /> 姓名 <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="学生姓名" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> 关联手机号</Label>
              <Input
                value={form.phone || ""}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="13800138000"
                inputMode="tel"
                pattern="[0-9]*"
              />
              <p className="text-[11px] text-muted-foreground">用于小程序 / 平板登录的验证码接收</p>
            </div>
          </div>

          {/* 4. 登录账号 + 密码 */}
          <div className="rounded-xl border border-primary/30 bg-accent/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">登录凭证</span>
              <span className="text-[11px] text-muted-foreground">小程序 / 平板端使用</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">登录账号</Label>
                <div className="relative">
                  <Input
                    value={form.login_username || ""}
                    onChange={e => setForm({ ...form, login_username: e.target.value })}
                    placeholder="留空则不开通账号登录"
                    autoComplete="off"
                    className={cn(
                      "pr-9",
                      usernameCheck.status === "taken" && "border-destructive focus-visible:ring-destructive",
                      usernameCheck.status === "available" && "border-success focus-visible:ring-success"
                    )}
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {usernameCheck.status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {usernameCheck.status === "available" && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {usernameCheck.status === "taken" && <AlertCircle className="h-4 w-4 text-destructive" />}
                  </div>
                </div>
                {showUsernameHint && (
                  <p className={cn(
                    "text-[11px]",
                    usernameCheck.status === "checking" && "text-muted-foreground",
                    usernameCheck.status === "available" && "text-success",
                    usernameCheck.status === "taken" && "text-destructive"
                  )}>
                    {usernameCheck.status === "checking" && "正在检查…"}
                    {usernameCheck.status === "available" && "登录账号可用"}
                    {usernameCheck.status === "taken" && (usernameCheck.reason || "已被占用")}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  登录密码 {!isEdit && (form.login_username || "").trim() && <span className="text-destructive">*</span>}
                  {isEdit && <span className="text-[10px] text-muted-foreground">（留空则不修改）</span>}
                </Label>
                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={form.login_password || ""}
                    onChange={e => setForm({ ...form, login_password: e.target.value })}
                    placeholder={isEdit ? "如需修改请输入新密码" : "至少 6 位"}
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
                {isEdit && initial?._has_login_password && (
                  <p className="text-[11px] text-muted-foreground">已设置过密码</p>
                )}
              </div>
            </div>

            {/* 编辑模式: 重置密码快捷按钮 */}
            {isEdit && (
              !resetMode ? (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setResetMode(true)}>
                  <KeyRound className="h-3 w-3" /> 单独重置密码
                </Button>
              ) : (
                <div className="rounded-lg border bg-background p-2 space-y-2">
                  <Label className="text-xs">新密码 (至少 6 位)</Label>
                  <div className="flex items-center gap-2">
                    <Input value={newPwd} onChange={e => setNewPwd(e.target.value)} type="password" placeholder="新密码" autoFocus />
                    <Button size="sm" variant="outline" onClick={() => { setResetMode(false); setNewPwd(""); }}>取消</Button>
                    <Button size="sm" onClick={submitResetPwd} disabled={resetPending}>
                      {resetPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      确认
                    </Button>
                  </div>
                </div>
              )
            )}
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
