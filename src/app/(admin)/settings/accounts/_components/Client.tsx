"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DataToolbar } from "@/components/admin/DataToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateCN } from "@/lib/utils";
import { MoreHorizontal, Pencil, Trash2, Power, KeyRound, Users, Loader2, Filter, X } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Form } from "./Form";
import { deleteAccount, listAccounts, resetPassword, toggleAccountStatus } from "../actions";
import { toast } from "sonner";

const ROLE_LABEL: Record<string, { label: string; variant: any }> = {
  super_admin: { label: "超级管理员", variant: "destructive" },
  admin: { label: "平台管理员", variant: "default" },
  channel_admin: { label: "渠道管理员", variant: "info" }
};

export function Client({
  initialRows, initialTotal, initialQ, initialPage, initialRole, initialChannelId, initialChannelName, channels
}: {
  initialRows: any[];
  initialTotal: number;
  initialQ: string;
  initialPage: number;
  initialRole: string;
  initialChannelId?: string | null;
  initialChannelName?: string | null;
  channels: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [role, setRole] = useState(initialRole);
  const [channelId, setChannelId] = useState<string | null>(initialChannelId || null);
  const [channelName] = useState<string | null>(initialChannelName || null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [delTarget, setDelTarget] = useState<any>(null);
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [newPw, setNewPw] = useState("");
  const [resetPending, startReset] = useTransition();
  const [, start] = useTransition();

  function reload(nextQ = q, nextPage = page, nextRole = role, nextChannelId = channelId) {
    start(async () => {
      const { rows: r, total: t } = await listAccounts({
        q: nextQ,
        page: nextPage,
        role: nextRole || undefined,
        channel_id: nextChannelId,
        pageSize: 20
      });
      setRows(r); setTotal(t);
    });
  }

  function onSearch(v: string) {
    setQ(v); setPage(1);
    reload(v, 1, role, channelId);
  }
  function onRoleChange(v: string) {
    const next = v === "__all__" ? "" : v;
    setRole(next); setPage(1);
    reload(q, 1, next, channelId);
  }
  function clearChannelFilter() {
    setChannelId(null); setPage(1);
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (role) sp.set("role", role);
    router.replace(`/settings/accounts${sp.toString() ? "?" + sp.toString() : ""}`);
    reload(q, 1, role, null);
  }

  function onCreate() {
    // 如果当前筛选了某渠道，新建时预填该渠道 + role 默认 channel_admin
    if (channelId) {
      setEditing({ channel_id: channelId, role: "channel_admin" });
    } else {
      setEditing(null);
    }
    setFormOpen(true);
  }
  function onEdit(r: any) { setEditing(r); setFormOpen(true); }

  async function onDelete() {
    if (!delTarget) return;
    try {
      await deleteAccount(delTarget.id);
      toast.success("已删除");
      setDelTarget(null);
      reload();
    } catch (e: any) {
      toast.error(e?.message || "删除失败");
    }
  }

  async function onToggle(r: any) {
    try {
      await toggleAccountStatus(r.id, r.status === "active" ? "disabled" : "active");
      toast.success(r.status === "active" ? "已停用" : "已启用");
      reload();
    } catch (e: any) {
      toast.error(e?.message || "操作失败");
    }
  }

  function openReset(r: any) { setResetTarget(r); setNewPw(""); }

  function submitReset() {
    if (!resetTarget) return;
    if (newPw.length < 6) { toast.error("密码至少 6 位"); return; }
    startReset(async () => {
      try {
        await resetPassword(resetTarget.id, newPw);
        toast.success("密码已重置");
        setResetTarget(null);
        setNewPw("");
      } catch (e: any) {
        toast.error(e?.message || "重置失败");
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <DataToolbar
          q={q}
          onSearch={onSearch}
          onCreate={onCreate}
          createLabel="新增账号"
          placeholder="搜索用户名或显示名…"
          rightExtra={
            <Select value={role || "__all__"} onValueChange={onRoleChange}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="全部角色" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部角色</SelectItem>
                {Object.entries(ROLE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {channelName && (
          <div className="-mt-1 mb-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-accent/40 px-3 py-2 text-xs">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">已筛选渠道：</span>
            <Badge variant="default" className="font-medium">{channelName}</Badge>
            <button
              onClick={clearChannelFilter}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3 w-3" /> 清除筛选
            </button>
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="还没有账号"
            description="点击右上角「新增账号」开始"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>显示名</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>归属渠道</TableHead>
                <TableHead>上次登录</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => {
                const role = ROLE_LABEL[r.role] || { label: r.role, variant: "muted" };
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-medium">{r.username}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.display_name}</div>
                      {r.phone && <div className="text-[11px] text-muted-foreground">{r.phone}</div>}
                    </TableCell>
                    <TableCell><Badge variant={role.variant}>{role.label}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {r.channels?.name || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateCN(r.last_login_at)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="truncate max-w-[14rem]">@{r.username} · {r.display_name}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => onEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" /> 编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openReset(r)}>
                            <KeyRound className="h-3.5 w-3.5" /> 重置密码
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onToggle(r)}>
                            <Power className="h-3.5 w-3.5" /> {r.status === "active" ? "停用" : "启用"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setDelTarget(r)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" /> 删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Pagination page={page} pageSize={20} total={total} onChange={p => { setPage(p); reload(q, p, role, channelId); }} />

      <Form
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        channels={channels}
        onSaved={() => reload()}
      />

      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={v => !v && setDelTarget(null)}
        title="删除账号"
        description={`确定要删除账号「${delTarget?.username}」吗？删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onConfirm={onDelete}
      />

      <Dialog open={!!resetTarget} onOpenChange={v => { if (!v) { setResetTarget(null); setNewPw(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>
              将为账号「{resetTarget?.username}」设置新密码（至少 6 位）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>新密码</Label>
            <Input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="至少 6 位"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>取消</Button>
            <Button onClick={submitReset} disabled={resetPending}>
              {resetPending && <Loader2 className="h-4 w-4 animate-spin" />}
              确认重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
