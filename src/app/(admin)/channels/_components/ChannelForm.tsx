"use client";
import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RegionPicker } from "@/components/admin/RegionPicker";
import { upsertChannel, getChannelAdmins, checkChannelNameAvailable, type ChannelInput } from "../actions";
import { LinkedAdminsManager } from "./LinkedAdminsManager";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Check, Building2, MapPin, ShieldCheck,
  CircleCheck, CheckCircle2, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const STEPS = [
  { key: "basic", title: "基础信息", desc: "渠道名称、级别", icon: Building2 },
  { key: "region", title: "归属与联系", desc: "省市区、联系人", icon: MapPin },
  { key: "admin", title: "管理员账号", desc: "登录凭证（可跳过）", icon: ShieldCheck },
  { key: "review", title: "确认", desc: "核对并提交", icon: CircleCheck }
] as const;

type StepKey = typeof STEPS[number]["key"];
type NameCheck = { status: "idle" | "checking" | "available" | "taken"; reason?: string };

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
  const [step, setStep] = useState<StepKey>("basic");
  const [showPwd, setShowPwd] = useState(false);
  const [pending, start] = useTransition();
  const [linkedAdmins, setLinkedAdmins] = useState<any[]>([]);
  const [nameCheck, setNameCheck] = useState<NameCheck>({ status: "idle" });

  const isEdit = !!form.id;

  // 名称实时去重检查 (300ms debounce)
  useEffect(() => {
    if (!open) return;
    const n = (form.name || "").trim();
    // 编辑模式下名称未变更 → 不需要检查
    if (isEdit && n === (initial?.name || "")) { setNameCheck({ status: "idle" }); return; }
    if (!n) { setNameCheck({ status: "idle" }); return; }
    setNameCheck({ status: "checking" });
    const t = setTimeout(async () => {
      try {
        const r = await checkChannelNameAvailable(n, form.id);
        if (r.ok) setNameCheck({ status: "available" });
        else setNameCheck({ status: "taken", reason: r.reason });
      } catch {
        setNameCheck({ status: "idle" });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [form.name, open, isEdit, initial?.name, form.id]);

  useEffect(() => {
    if (!open) return;
    setStep("basic");
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
      getChannelAdmins(initial.id).then(setLinkedAdmins).catch(() => setLinkedAdmins([]));
    } else {
      setForm(blankForm());
      setLinkedAdmins([]);
    }
  }, [initial, open]);

  function validateStep(s: StepKey): string | null {
    if (s === "basic") {
      if (!form.name.trim()) return "请填写渠道名称";
      if (nameCheck.status === "taken") return nameCheck.reason || "渠道名称已存在";
      if (nameCheck.status === "checking") return "名称校验中，请稍候…";
    }
    if (s === "admin" && !isEdit && form.withAdmin) {
      if (!form.admin_username?.trim()) return "请填写管理员账号";
      if (!form.admin_password || form.admin_password.length < 6) return "管理员密码至少 6 位";
      if (!form.admin_display_name?.trim()) return "请填写管理员显示名";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  }
  function prev() {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  }

  function submit() {
    // 提交前全量校验
    for (const s of STEPS) {
      const err = validateStep(s.key);
      if (err) { setStep(s.key); toast.error(err); return; }
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
        toast.success(isEdit ? "已更新" : (form.withAdmin ? "已创建渠道与管理员账号" : "已创建渠道"));
        onOpenChange(false);
        onSaved?.();
      } catch (e: any) {
        toast.error(e?.message || "保存失败");
      }
    });
  }

  // ============ 渲染 ============
  // 编辑模式: 走单页表单(无向导步骤), 但仍走宽对话框
  if (isEdit) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>编辑渠道商</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <BasicFields form={form} setForm={setForm} levels={levels} nameCheck={nameCheck} />
            <RegionFields form={form} setForm={setForm} />
            <StatusField form={form} setForm={setForm} />
            <LinkedAdminsManager
              channelId={form.id!}
              admins={linkedAdmins}
              onRefresh={() => getChannelAdmins(form.id!).then(setLinkedAdmins).catch(() => {})}
            />
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

  const currentIdx = STEPS.findIndex(s => s.key === step);
  const isLastStep = currentIdx === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>新增渠道商</DialogTitle>
        </DialogHeader>

        {/* 步骤指示器 */}
        <Stepper steps={STEPS as any} currentIdx={currentIdx} onJump={(k) => {
          // 仅允许跳到已通过验证的步骤或往回
          const targetIdx = STEPS.findIndex(s => s.key === k);
          if (targetIdx <= currentIdx) setStep(k);
        }} />

        <div className="min-h-[280px] py-3 max-h-[60vh] overflow-y-auto pr-1">
          {step === "basic" && <BasicFields form={form} setForm={setForm} levels={levels} nameCheck={nameCheck} />}
          {step === "region" && <RegionFields form={form} setForm={setForm} />}
          {step === "admin" && (
            <AdminFields
              form={form}
              setForm={setForm}
              showPwd={showPwd}
              setShowPwd={setShowPwd}
            />
          )}
          {step === "review" && <ReviewPanel form={form} levels={levels} />}
        </div>

        <DialogFooter className="flex !justify-between sm:!justify-between">
          <Button variant="outline" onClick={prev} disabled={currentIdx === 0 || pending}>
            <ArrowLeft className="h-4 w-4" /> 上一步
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>取消</Button>
            {!isLastStep ? (
              <Button onClick={next}>下一步 <ArrowRight className="h-4 w-4" /></Button>
            ) : (
              <Button onClick={submit} disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                完成创建
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================
// 步骤指示器
// =============================================================
function Stepper({
  steps, currentIdx, onJump
}: {
  steps: Array<{ key: string; title: string; desc: string; icon: any }>;
  currentIdx: number;
  onJump: (k: any) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-1 px-1 py-2">
      {steps.map((s, i) => {
        const active = i === currentIdx;
        const done = i < currentIdx;
        const Icon = s.icon;
        return (
          <div key={s.key} className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onJump(s.key)}
              disabled={i > currentIdx}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors min-w-0",
                i <= currentIdx && "cursor-pointer hover:bg-accent",
                i > currentIdx && "cursor-not-allowed opacity-60"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all",
                  active && "bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-110",
                  done && "bg-success text-success-foreground",
                  !active && !done && "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <div className="text-left min-w-0">
                <div className={cn(
                  "text-xs font-medium truncate",
                  active && "text-foreground",
                  done && "text-success",
                  !active && !done && "text-muted-foreground"
                )}>{s.title}</div>
                <div className="text-[10px] text-muted-foreground truncate">{s.desc}</div>
              </div>
            </button>
            {i < steps.length - 1 && (
              <div className={cn("h-px flex-1 mx-1", i < currentIdx ? "bg-success" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================
// 步骤字段组件
// =============================================================
function BasicFields({ form, setForm, levels, nameCheck }: any) {
  const cs: NameCheck = nameCheck || { status: "idle" };
  const showHint = (form.name || "").trim().length > 0 && cs.status !== "idle";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>渠道名称 <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="例：北京启明渠道商"
              autoFocus
              className={cn(
                "pr-9",
                cs.status === "taken" && "border-destructive focus-visible:ring-destructive",
                cs.status === "available" && "border-success focus-visible:ring-success"
              )}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {cs.status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {cs.status === "available" && <CheckCircle2 className="h-4 w-4 text-success" />}
              {cs.status === "taken" && <AlertCircle className="h-4 w-4 text-destructive" />}
            </div>
          </div>
          {showHint && (
            <p className={cn(
              "text-[11px] flex items-center gap-1",
              cs.status === "checking" && "text-muted-foreground",
              cs.status === "available" && "text-success",
              cs.status === "taken" && "text-destructive"
            )}>
              {cs.status === "checking" && "正在检查名称是否可用…"}
              {cs.status === "available" && "名称可用"}
              {cs.status === "taken" && (cs.reason || "已存在同名渠道")}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>渠道级别</Label>
          <Select value={form.level_id || ""} onValueChange={v => setForm({ ...form, level_id: v || null })}>
            <SelectTrigger><SelectValue placeholder="未指定" /></SelectTrigger>
            <SelectContent>
              {levels.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>备注</Label>
        <Textarea
          value={form.remark || ""}
          onChange={e => setForm({ ...form, remark: e.target.value })}
          rows={3}
          placeholder="可填写合作背景、合同信息等"
        />
      </div>
    </div>
  );
}

function RegionFields({ form, setForm }: any) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>归属地区</Label>
        <RegionPicker
          value={{ province: form.province, city: form.city, district: form.district }}
          onChange={v => setForm({ ...form, ...v })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>详细地址</Label>
        <Input
          value={form.address || ""}
          onChange={e => setForm({ ...form, address: e.target.value })}
          placeholder="街道、门牌号等"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>联系人</Label>
          <Input value={form.contact_name || ""} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="姓名" />
        </div>
        <div className="space-y-1.5">
          <Label>联系电话</Label>
          <Input value={form.contact_phone || ""} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="13800138000" />
        </div>
      </div>
    </div>
  );
}

function StatusField({ form, setForm }: any) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
      <div>
        <div className="text-sm font-medium">状态</div>
        <div className="text-xs text-muted-foreground">停用后渠道商账号无法登录</div>
      </div>
      <Switch
        checked={form.status === "active"}
        onCheckedChange={(c: boolean) => setForm({ ...form, status: c ? "active" : "disabled" })}
      />
    </div>
  );
}

function AdminFields({ form, setForm, showPwd, setShowPwd }: any) {
  return (
    <div className="rounded-xl border border-primary/30 bg-accent/30 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">同步创建渠道管理员账号</span>
        </div>
        <Switch
          checked={!!form.withAdmin}
          onCheckedChange={(c: boolean) => setForm({ ...form, withAdmin: c })}
        />
      </div>
      {!form.withAdmin && (
        <p className="text-[12px] text-muted-foreground">
          关闭后将仅创建渠道，可稍后到「账号管理」单独创建并绑定到此渠道。
        </p>
      )}
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
                autoFocus
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
                  onClick={() => setShowPwd((s: boolean) => !s)}
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
            新账号自动绑定到此渠道，role = channel_admin，登录后只能看本渠道数据。
          </p>
        </div>
      )}
    </div>
  );
}

function ReviewPanel({ form, levels }: { form: FormState; levels: { id: string; name: string }[] }) {
  const lv = levels.find(l => l.id === form.level_id);
  const region = [form.province, form.city, form.district].filter(Boolean).join(" · ") || "—";
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-sm flex-1 min-w-0 break-words">{value || <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Building2 className="h-4 w-4 text-primary" /> 基础信息
        </div>
        <Row label="渠道名称" value={<span className="font-medium">{form.name}</span>} />
        <Row label="渠道级别" value={lv?.name} />
        <Row label="备注" value={form.remark} />
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-primary" /> 归属与联系
        </div>
        <Row label="归属地区" value={region} />
        <Row label="详细地址" value={form.address} />
        <Row label="联系人" value={form.contact_name} />
        <Row label="联系电话" value={form.contact_phone} />
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="h-4 w-4 text-primary" /> 管理员账号
        </div>
        {form.withAdmin ? (
          <>
            <Row label="登录账号" value={<code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{form.admin_username}</code>} />
            <Row label="登录密码" value={<span className="text-muted-foreground">已设置（{form.admin_password?.length} 位）</span>} />
            <Row label="显示名称" value={form.admin_display_name} />
            <Row label="角色" value={<Badge variant="info">渠道管理员</Badge>} />
          </>
        ) : (
          <p className="text-xs text-muted-foreground">未创建账号，可稍后在「账号管理」补建</p>
        )}
      </div>
    </div>
  );
}

