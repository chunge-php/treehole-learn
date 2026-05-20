"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { updateProfile, changePassword } from "./actions";
import { toast } from "sonner";
import { Loader2, User, KeyRound } from "lucide-react";
import { formatDateCN } from "@/lib/utils";

const ROLE_LABEL: Record<string, { label: string; variant: any }> = {
  super_admin: { label: "超级管理员", variant: "destructive" },
  admin: { label: "平台管理员", variant: "default" },
  channel_admin: { label: "渠道管理员", variant: "info" }
};

export function ProfileForm({ profile }: { profile: any }) {
  const [form, setForm] = useState({
    display_name: profile.display_name || "",
    phone: profile.phone || "",
    email: profile.email || "",
    avatar_url: profile.avatar_url || ""
  });
  const [pwd, setPwd] = useState({ old: "", n1: "", n2: "" });
  const [savingProfile, startSaveProfile] = useTransition();
  const [savingPwd, startSavePwd] = useTransition();

  const role = ROLE_LABEL[profile.role] || { label: profile.role, variant: "muted" };

  function submitProfile() {
    if (!form.display_name.trim()) { toast.error("请填写显示名称"); return; }
    startSaveProfile(async () => {
      try {
        await updateProfile(form);
        toast.success("资料已更新（部分变更将在下次登录后在顶栏生效）");
      } catch (e: any) {
        toast.error(e?.message || "保存失败");
      }
    });
  }

  function submitPwd() {
    if (!pwd.old) { toast.error("请输入旧密码"); return; }
    if (pwd.n1.length < 6) { toast.error("新密码至少 6 位"); return; }
    if (pwd.n1 !== pwd.n2) { toast.error("两次新密码不一致"); return; }
    startSavePwd(async () => {
      try {
        await changePassword(pwd.old, pwd.n1);
        toast.success("密码已修改，请重新登录");
        setPwd({ old: "", n1: "", n2: "" });
      } catch (e: any) {
        toast.error(e?.message || "修改失败");
      }
    });
  }

  const initials = (profile.display_name || profile.username || "?").trim().slice(0, 1).toUpperCase();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>我的资料</CardTitle>
              <CardDescription>显示名称、联系方式、头像</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 rounded-lg bg-muted/30 p-3">
            <Avatar className="h-14 w-14">
              {form.avatar_url && <AvatarImage src={form.avatar_url} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{profile.username}</span>
                <Badge variant={role.variant}>{role.label}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {profile.channels?.name ? `归属渠道：${profile.channels.name}` : "无归属渠道"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                上次登录：{formatDateCN(profile.last_login_at)}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>显示名称 <span className="text-destructive">*</span></Label>
            <Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>手机</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="13800138000" />
            </div>
            <div className="space-y-1.5">
              <Label>邮箱</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>头像 URL</Label>
            <Input value={form.avatar_url} onChange={e => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…/avatar.png" />
          </div>

          <div className="flex justify-end">
            <Button onClick={submitProfile} disabled={savingProfile}>
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
              保存资料
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-warning/10 text-warning">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>修改密码</CardTitle>
              <CardDescription>修改成功后请重新登录</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>旧密码 <span className="text-destructive">*</span></Label>
            <Input
              type="password"
              value={pwd.old}
              onChange={e => setPwd({ ...pwd, old: e.target.value })}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label>新密码 <span className="text-destructive">*</span></Label>
            <Input
              type="password"
              value={pwd.n1}
              onChange={e => setPwd({ ...pwd, n1: e.target.value })}
              placeholder="至少 6 位"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label>确认新密码 <span className="text-destructive">*</span></Label>
            <Input
              type="password"
              value={pwd.n2}
              onChange={e => setPwd({ ...pwd, n2: e.target.value })}
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={submitPwd} disabled={savingPwd}>
              {savingPwd && <Loader2 className="h-4 w-4 animate-spin" />}
              修改密码
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
