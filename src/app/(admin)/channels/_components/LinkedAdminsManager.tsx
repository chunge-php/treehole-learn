"use client";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  createAccount,
  updateAccount,
  resetPassword,
  toggleAccountStatus,
  deleteAccount,
  checkAccountUsernameAvailable
} from "@/app/(admin)/settings/accounts/actions";
import { toast } from "sonner";
import {
  ShieldCheck, User, Plus, KeyRound, Pencil, Power, Trash2, X,
  Eye, EyeOff, Loader2, CheckCircle2, AlertCircle
} from "lucide-react";
import { cn, formatDateCN } from "@/lib/utils";

type AdminRow = {
  id: string;
  username: string;
  display_name: string;
  status: "active" | "disabled";
  last_login_at: string | null;
};
type NameCheck = { status: "idle" | "checking" | "available" | "taken"; reason?: string };

export function LinkedAdminsManager({
  channelId,
  admins,
  onRefresh
}: {
  channelId: string;
  admins: AdminRow[];
  onRefresh: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"password" | "info" | null>(null);
  const [delTarget, setDelTarget] = useState<AdminRow | null>(null);

  function toggle(id: string, m: "password" | "info") {
    if (openId === id && mode === m) {
      setOpenId(null); setMode(null);
    } else {
      setOpenId(id); setMode(m);
    }
  }

  async function onToggleStatus(a: AdminRow) {
    try {
      await toggleAccountStatus(a.id, a.status === "active" ? "disabled" : "active");
      toast.success(a.status === "active" ? "已停用" : "已启用");
      onRefresh();
    } catch (e: any) { toast.error(e?.message || "操作失败"); }
  }

  async function onDelete() {
    if (!delTarget) return;
    try {
      await deleteAccount(delTarget.id);
      toast.success("已删除");
      setDelTarget(null);
      onRefresh();
    } catch (e: any) { toast.error(e?.message || "删除失败"); }
  }

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">渠道管理员账号</span>
          <Badge variant="muted" className="px-1.5 py-0">{admins.length} / 1</Badge>
        </div>
        {admins.length >= 1 ? (
          <span className="text-[11px] text-muted-foreground">每个渠道仅允许 1 个登录账号</span>
        ) : (
          <Button
            variant={creating ? "ghost" : "soft"}
            size="sm"
            onClick={() => { setCreating(v => !v); setOpenId(null); setMode(null); }}
          >
            {creating ? <><X className="h-3.5 w-3.5" /> 收起</> : <><Plus className="h-3.5 w-3.5" /> 新增账号</>}
          </Button>
        )}
      </div>

      {creating && (
        <CreatePanel
          channelId={channelId}
          onCancel={() => setCreating(false)}
          onDone={() => { setCreating(false); onRefresh(); }}
        />
      )}

      {admins.length === 0 ? (
        !creating && (
          <div className="text-xs text-muted-foreground py-3 text-center">
            尚未关联任何账号 — 点击右上角「新增账号」开始
          </div>
        )
      ) : (
        <div className="space-y-2">
          {admins.map(a => {
            const isOpen = openId === a.id;
            return (
              <div key={a.id} className="rounded-lg border bg-background overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 text-xs">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono font-medium">{a.username}</span>
                  <span className="text-muted-foreground">· {a.display_name}</span>
                  <Badge variant={a.status === "active" ? "success" : "muted"} className="px-1.5 py-0 text-[10px]">
                    {a.status === "active" ? "正常" : "停用"}
                  </Badge>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    上次登录 {formatDateCN(a.last_login_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1 border-t bg-muted/20 px-2 py-1.5">
                  <Button
                    variant={isOpen && mode === "password" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => toggle(a.id, "password")}
                  >
                    <KeyRound className="h-3 w-3" /> 改密码
                  </Button>
                  <Button
                    variant={isOpen && mode === "info" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => toggle(a.id, "info")}
                  >
                    <Pencil className="h-3 w-3" /> 改信息
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onToggleStatus(a)}>
                    <Power className="h-3 w-3" /> {a.status === "active" ? "停用" : "启用"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDelTarget(a)}
                  >
                    <Trash2 className="h-3 w-3" /> 删除
                  </Button>
                </div>
                {isOpen && mode === "password" && (
                  <ResetPasswordPanel
                    accountId={a.id}
                    username={a.username}
                    onCancel={() => { setOpenId(null); setMode(null); }}
                    onDone={() => { setOpenId(null); setMode(null); onRefresh(); }}
                  />
                )}
                {isOpen && mode === "info" && (
                  <EditInfoPanel
                    initial={a}
                    onCancel={() => { setOpenId(null); setMode(null); }}
                    onDone={() => { setOpenId(null); setMode(null); onRefresh(); }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={v => !v && setDelTarget(null)}
        title="删除账号"
        description={`确定要删除账号「${delTarget?.username}」吗？删除后该账号无法登录。`}
        confirmText="确认删除"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}

// =============================================================
// 新增账号面板
// =============================================================
function CreatePanel({ channelId, onCancel, onDone }: { channelId: string; onCancel: () => void; onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pending, start] = useTransition();
  const [check, setCheck] = useState<NameCheck>({ status: "idle" });

  useEffect(() => {
    const u = username.trim();
    if (!u) { setCheck({ status: "idle" }); return; }
    setCheck({ status: "checking" });
    const t = setTimeout(async () => {
      try {
        const r = await checkAccountUsernameAvailable(u);
        if (r.ok) setCheck({ status: "available" });
        else setCheck({ status: "taken", reason: r.reason });
      } catch { setCheck({ status: "idle" }); }
    }, 300);
    return () => clearTimeout(t);
  }, [username]);

  function submit() {
    if (!username.trim()) { toast.error("请填写用户名"); return; }
    if (!displayName.trim()) { toast.error("请填写显示名称"); return; }
    if (!password || password.length < 6) { toast.error("密码至少 6 位"); return; }
    if (check.status === "checking") { toast.error("校验中，请稍候…"); return; }
    if (check.status === "taken") { toast.error(check.reason || "用户名已占用"); return; }
    start(async () => {
      try {
        await createAccount({
          username: username.trim(),
          password,
          display_name: displayName.trim(),
          role: "channel_admin",
          channel_id: channelId,
          status: "active"
        });
        toast.success("账号已创建");
        onDone();
      } catch (e: any) { toast.error(e?.message || "创建失败"); }
    });
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-accent/30 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">登录账号 <span className="text-destructive">*</span></Label>
          <NameInput value={username} onChange={setUsername} check={check} placeholder="字母数字" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">显示名称 <span className="text-destructive">*</span></Label>
          <Input
            className="h-9"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="例：张三"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">登录密码 <span className="text-destructive">*</span></Label>
        <PasswordInput value={password} onChange={setPassword} show={showPwd} onToggle={() => setShowPwd(s => !s)} />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>取消</Button>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          创建账号
        </Button>
      </div>
    </div>
  );
}

// =============================================================
// 改密码面板
// =============================================================
function ResetPasswordPanel({
  accountId, username, onCancel, onDone
}: {
  accountId: string;
  username: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    if (!pwd || pwd.length < 6) { toast.error("密码至少 6 位"); return; }
    start(async () => {
      try {
        await resetPassword(accountId, pwd);
        toast.success(`「${username}」密码已重置`);
        onDone();
      } catch (e: any) { toast.error(e?.message || "重置失败"); }
    });
  }

  return (
    <div className="border-t bg-accent/20 px-3 py-3 space-y-2">
      <Label className="text-xs">为「{username}」设置新密码（至少 6 位）</Label>
      <div className="flex items-center gap-2">
        <PasswordInput value={pwd} onChange={setPwd} show={show} onToggle={() => setShow(s => !s)} className="flex-1" />
        <Button size="sm" variant="outline" onClick={onCancel}>取消</Button>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          确认
        </Button>
      </div>
    </div>
  );
}

// =============================================================
// 改信息面板 (用户名 + 显示名)
// =============================================================
function EditInfoPanel({
  initial, onCancel, onDone
}: {
  initial: AdminRow;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [username, setUsername] = useState(initial.username);
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [pending, start] = useTransition();
  const [check, setCheck] = useState<NameCheck>({ status: "idle" });

  useEffect(() => {
    const u = username.trim();
    // 未变更跳过
    if (u === initial.username) { setCheck({ status: "idle" }); return; }
    if (!u) { setCheck({ status: "idle" }); return; }
    setCheck({ status: "checking" });
    const t = setTimeout(async () => {
      try {
        const r = await checkAccountUsernameAvailable(u, initial.id);
        if (r.ok) setCheck({ status: "available" });
        else setCheck({ status: "taken", reason: r.reason });
      } catch { setCheck({ status: "idle" }); }
    }, 300);
    return () => clearTimeout(t);
  }, [username, initial.id, initial.username]);

  function submit() {
    if (!username.trim()) { toast.error("请填写用户名"); return; }
    if (!displayName.trim()) { toast.error("请填写显示名称"); return; }
    if (check.status === "checking") { toast.error("校验中，请稍候…"); return; }
    if (check.status === "taken") { toast.error(check.reason || "用户名已占用"); return; }
    start(async () => {
      try {
        // updateAccount 需要完整 AccountInput, 但只更新 username 和 display_name 这里需要先拿到原账号其他字段, 简化: 让 updateAccount 在不传字段时保持原值即可。这里仅传必要字段
        await updateAccount({
          id: initial.id,
          username: username.trim(),
          display_name: displayName.trim(),
          role: "channel_admin",
          channel_id: null,
          status: initial.status
        } as any);
        toast.success("账号信息已更新");
        onDone();
      } catch (e: any) { toast.error(e?.message || "保存失败"); }
    });
  }

  return (
    <div className="border-t bg-accent/20 px-3 py-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">登录账号 <span className="text-destructive">*</span></Label>
          <NameInput value={username} onChange={setUsername} check={check} placeholder="字母数字" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">显示名称 <span className="text-destructive">*</span></Label>
          <Input
            className="h-9"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>取消</Button>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          保存
        </Button>
      </div>
    </div>
  );
}

// =============================================================
// 复用小组件
// =============================================================
function NameInput({
  value, onChange, check, placeholder
}: {
  value: string;
  onChange: (v: string) => void;
  check: NameCheck;
  placeholder?: string;
}) {
  const showHint = value.trim().length > 0 && check.status !== "idle";
  return (
    <div>
      <div className="relative">
        <Input
          className={cn(
            "h-9 pr-9 font-mono",
            check.status === "taken" && "border-destructive focus-visible:ring-destructive",
            check.status === "available" && "border-success focus-visible:ring-success"
          )}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          {check.status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {check.status === "available" && <CheckCircle2 className="h-4 w-4 text-success" />}
          {check.status === "taken" && <AlertCircle className="h-4 w-4 text-destructive" />}
        </div>
      </div>
      {showHint && (
        <p className={cn(
          "mt-1 text-[11px]",
          check.status === "checking" && "text-muted-foreground",
          check.status === "available" && "text-success",
          check.status === "taken" && "text-destructive"
        )}>
          {check.status === "checking" && "正在检查…"}
          {check.status === "available" && "可用"}
          {check.status === "taken" && (check.reason || "已被占用")}
        </p>
      )}
    </div>
  );
}

function PasswordInput({
  value, onChange, show, onToggle, className
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="至少 6 位"
        className="h-9 pr-9"
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
