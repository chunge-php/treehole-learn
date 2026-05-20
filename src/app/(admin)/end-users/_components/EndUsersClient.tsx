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
import { MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
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
      创建时间: formatDateCN(r.created_at)
    }));
    downloadExcel(data, `普通用户导出_${new Date().getTime()}.xlsx`);
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
          placeholder="搜索姓名/电话/登录账号…"
          rightExtra={
            !isChannelAdmin && (
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
            )
          }
        />

        {/* 店铺筛选 (与渠道联动) */}
        <div className="-mt-1 mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">店铺筛选</span>
          <Combobox
            key={`store-filter-${channelId || "all"}`}
            options={storesInChannel.map(s => ({
              value: s.id,
              label: s.name,
              hint: !channelId ? s.channels?.name : undefined
            }))}
            value={storeId}
            onChange={onStoreChange}
            placeholder={channelId ? `「${channels.find(c => c.id === channelId)?.name}」下的全部店铺` : "全部店铺"}
            searchPlaceholder="搜索店铺名…"
            emptyText={channelId ? "该渠道下暂无店铺" : "暂无店铺"}
            triggerClassName="h-9 w-64"
            clearable
          />
          {channelId && (
            <span className="text-[11px] text-primary">
              · 已联动: 仅显示该渠道下 {storesInChannel.length} 家店铺
            </span>
          )}
        </div>

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
                <TableHead>手机号</TableHead>
                <TableHead>创建时间</TableHead>
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
                  <TableCell className="text-xs text-muted-foreground">{formatDateCN(r.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" /> 编辑
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
      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={v => !v && setDelTarget(null)}
        title="删除普通用户"
        description={`确定要删除「${delTarget?.name}」吗？该用户的所有测评记录、订单也将一并删除。`}
        confirmText="确认删除"
        destructive
        onConfirm={onDelete}
      />
    </Card>
  );
}
