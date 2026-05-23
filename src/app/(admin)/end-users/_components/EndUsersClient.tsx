"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { DataToolbar } from "@/components/admin/DataToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateCN } from "@/lib/utils";
import { MoreHorizontal, Pencil, Trash2, Users, ClipboardList } from "lucide-react";
import { AssignmentsDialog } from "./AssignmentsDialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { EndUserForm } from "./EndUserForm";
import { ImportDialog } from "./ImportDialog";
import { deleteEndUser, listEndUsers } from "../actions";
import { downloadExcel } from "@/lib/excel";
import { toast } from "sonner";

type StoreOpt = { id: string; name: string; channel_id: string; channels?: { name: string } };
type ChannelOpt = { id: string; name: string };

export function EndUsersClient({
  initialRows, initialTotal, initialQ, initialPage, initialChannelId, initialStoreId, stores, channels, role
}: {
  initialRows: any[];
  initialTotal: number;
  initialQ: string;
  initialPage: number;
  initialChannelId?: string | null;
  initialStoreId?: string | null;
  stores: StoreOpt[];
  channels: ChannelOpt[];
  role: "super_admin" | "admin" | "channel_admin";
}) {
  const router = useRouter();
  const isChannelAdmin = role === "channel_admin";
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [channelId, setChannelId] = useState<string | null>(initialChannelId || null);
  const [storeId, setStoreId] = useState<string | null>(initialStoreId || null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<any>(null);
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [, start] = useTransition();

  // 店铺下拉随渠道联动
  const storesInChannel = useMemo(() => {
    if (!channelId) return stores;
    return stores.filter(s => s.channel_id === channelId);
  }, [stores, channelId]);

  function syncUrl(nextChannel: string | null, nextStore: string | null, nextQ: string) {
    const sp = new URLSearchParams();
    if (nextChannel) sp.set("channel_id", nextChannel);
    if (nextStore) sp.set("store_id", nextStore);
    if (nextQ) sp.set("q", nextQ);
    router.replace(`/end-users${sp.toString() ? "?" + sp.toString() : ""}`);
  }

  function reload(nextQ = q, nextPage = page, nextChannelId = channelId, nextStoreId = storeId) {
    start(async () => {
      const { rows: r, total: t } = await listEndUsers({
        q: nextQ, channel_id: nextChannelId, store_id: nextStoreId, page: nextPage, pageSize: 20
      });
      setRows(r); setTotal(t);
    });
  }

  function onChannelChange(v: string | null) {
    setChannelId(v); setPage(1);
    // 切换渠道时若当前店铺不在新渠道下, 自动清空
    let nextStore = storeId;
    if (v && storeId) {
      const inList = stores.find(s => s.id === storeId);
      if (!inList || inList.channel_id !== v) {
        nextStore = null;
        setStoreId(null);
      }
    }
    syncUrl(v, nextStore, q);
    reload(q, 1, v, nextStore);
  }

  function onStoreChange(v: string | null) {
    setStoreId(v); setPage(1);
    syncUrl(channelId, v, q);
    reload(q, 1, channelId, v);
  }

  function onSearch(v: string) {
    setQ(v); setPage(1);
    syncUrl(channelId, storeId, v);
    reload(v, 1, channelId, storeId);
  }

  function onCreate() { setEditing(null); setFormOpen(true); }
  function onEdit(r: any) { setEditing(r); setFormOpen(true); }

  function onExport() {
    const data = rows.map(r => ({
      用户编号: r.id,
      姓名: r.name,
      所属店铺: r.stores?.name || "",
      所属渠道: r.channels?.name || "",
      登录账号: r.login_username || "",
      关联手机号: r.phone || "",
      注册时间: formatDateCN(r.created_at),
      最近登录: r.last_login_at ? formatDateCN(r.last_login_at) : "从未登录"
    }));
    downloadExcel(data, `用户导出_${new Date().getTime()}.xlsx`);
    toast.success("已导出当前页数据");
  }

  async function onDelete() {
    if (!delTarget) return;
    try {
      await deleteEndUser(delTarget.id);
      toast.success("已删除");
      setDelTarget(null);
      reload();
    } catch (e: any) {
      toast.error(e?.message || "删除失败");
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <DataToolbar
          q={q}
          onSearch={onSearch}
          onCreate={onCreate}
          createLabel="新增用户"
          onImport={() => setImportOpen(true)}
          onExport={onExport}
          placeholder="搜索姓名 / 手机号 / 登录账号…"
          rightExtra={
            <div className="flex items-center gap-2">
              {!isChannelAdmin && (
                <Combobox
                  options={channels.map(c => ({ value: c.id, label: c.name }))}
                  value={channelId}
                  onChange={onChannelChange}
                  placeholder="全部渠道"
                  searchPlaceholder="搜索渠道…"
                  emptyText="无匹配渠道"
                  triggerClassName="h-9 w-40"
                  clearable
                />
              )}
              <Combobox
                key={`store-filter-${channelId || "all"}`}
                options={storesInChannel.map(s => ({
                  value: s.id,
                  label: s.name,
                  hint: !channelId ? s.channels?.name : undefined
                }))}
                value={storeId}
                onChange={onStoreChange}
                placeholder={channelId ? `「${channels.find(c => c.id === channelId)?.name}」下的店铺` : "全部店铺"}
                searchPlaceholder="搜索店铺名…"
                emptyText={channelId ? "该渠道下暂无店铺" : "暂无店铺"}
                triggerClassName="h-9 w-48"
                clearable
              />
            </div>
          }
        />

        {channelId && (
          <div className="-mt-1 mb-3 text-[11px] text-primary">
            已联动: 仅显示「{channels.find(c => c.id === channelId)?.name}」下的 {storesInChannel.length} 家店铺
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="还没有匹配的用户"
            description={(channelId || storeId || q) ? "试试清除筛选条件" : "点击右上角「新增用户」或批量导入开始"}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>所属店铺</TableHead>
                <TableHead>渠道</TableHead>
                <TableHead>登录账号</TableHead>
                <TableHead>关联手机号</TableHead>
                <TableHead>家长</TableHead>
                <TableHead>本周待办</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead>最近登录</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">#{r.seq_no}</div>
                  </TableCell>
                  <TableCell>
                    {r.stores?.name ? <Badge variant="outline">{r.stores.name}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.channels?.name || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {r.login_username ? (
                      <span className="font-mono text-xs">{r.login_username}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">— 未开通</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-xs">
                    {r.phone || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r._parent_nickname
                      ? <span className="text-foreground">{r._parent_nickname}</span>
                      : <span className="text-muted-foreground">未绑定</span>}
                  </TableCell>
                  <TableCell>
                    {r._pending_tasks > 0
                      ? <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">{r._pending_tasks}</Badge>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateCN(r.created_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.last_login_at ? formatDateCN(r.last_login_at) : <span className="opacity-60">从未登录</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="truncate max-w-[14rem]">「{r.name}」</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => onEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" /> 编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setAssignTarget(r)}>
                          <ClipboardList className="h-3.5 w-3.5" /> 作业管理
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setDelTarget(r)} className="text-destructive focus:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" /> 删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Pagination page={page} pageSize={20} total={total} onChange={p => { setPage(p); reload(q, p, channelId, storeId); }} />

      <EndUserForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        stores={stores}
        onSaved={() => reload()}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onDone={() => reload()}
      />
      <AssignmentsDialog
        target={assignTarget}
        onOpenChange={v => !v && setAssignTarget(null)}
        onChanged={() => reload()}
      />
      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={v => !v && setDelTarget(null)}
        title="删除用户"
        description={`确定要删除「${delTarget?.name}」吗？该用户的所有测评记录、订单也将一并删除。`}
        confirmText="确认删除"
        destructive
        onConfirm={onDelete}
      />
    </Card>
  );
}
