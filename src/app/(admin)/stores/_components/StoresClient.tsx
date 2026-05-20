"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataToolbar } from "@/components/admin/DataToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import Link from "next/link";
import { formatDateCN, formatMoney } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";
import { MoreHorizontal, Pencil, Trash2, Power, Store, Users, ClipboardList, Smartphone, TrendingUp } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { StoreForm } from "./StoreForm";
import { ImportDialog } from "./ImportDialog";
import { deleteStore, toggleStoreStatus, listStores } from "../actions";
import { downloadExcel } from "@/lib/excel";
import { toast } from "sonner";

export function StoresClient({
  initialRows, initialTotal, initialQ, initialPage, initialChannelId, channels, role
}: {
  initialRows: any[];
  initialTotal: number;
  initialQ: string;
  initialPage: number;
  initialChannelId?: string | null;
  channels: { id: string; name: string }[];
  role: "super_admin" | "admin" | "channel_admin";
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [channelId, setChannelId] = useState<string | null>(initialChannelId || null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<any>(null);
  const [, start] = useTransition();

  const isChannelAdmin = role === "channel_admin";

  function reload(nextQ = q, nextPage = page, nextChannelId = channelId) {
    start(async () => {
      const { rows: r, total: t } = await listStores({ q: nextQ, channel_id: nextChannelId, page: nextPage, pageSize: 20 });
      setRows(r); setTotal(t);
    });
  }

  function onChannelChange(v: string | null) {
    setChannelId(v); setPage(1);
    const sp = new URLSearchParams();
    if (v) sp.set("channel_id", v);
    if (q) sp.set("q", q);
    router.replace(`/stores${sp.toString() ? "?" + sp.toString() : ""}`);
    reload(q, 1, v);
  }

  const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));

  function onSearch(v: string) {
    setQ(v); setPage(1);
    reload(v, 1);
  }

  function onCreate() { setEditing(null); setFormOpen(true); }
  function onEdit(r: any) { setEditing(r); setFormOpen(true); }

  function onExport() {
    const data = rows.map(r => ({
      店铺编号: r.id,
      店铺名称: r.name,
      所属渠道: r.channels?.name || "",
      省: r.province || "",
      市: r.city || "",
      区: r.district || "",
      地址: r.address || "",
      联系人: r.contact_name || "",
      联系电话: r.contact_phone || "",
      用户数量: r._user_count ?? 0,
      测评人次: r._record_count ?? 0,
      设备数: r.device_count ?? 0,
      销售金额: Number(r._revenue || 0).toFixed(2),
      状态: r.status === "active" ? "正常" : "停用",
      创建时间: formatDateCN(r.created_at)
    }));
    downloadExcel(data, `店铺导出_${new Date().getTime()}.xlsx`);
    toast.success("已导出当前页数据");
  }

  async function onDelete() {
    if (!delTarget) return;
    try {
      await deleteStore(delTarget.id);
      toast.success("已删除");
      setDelTarget(null);
      reload();
    } catch (e: any) {
      toast.error(e?.message || "删除失败");
    }
  }

  async function onToggle(r: any) {
    try {
      await toggleStoreStatus(r.id, r.status === "active" ? "disabled" : "active");
      toast.success(r.status === "active" ? "已停用" : "已启用");
      reload();
    } catch (e: any) {
      toast.error(e?.message || "操作失败");
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <DataToolbar
          q={q}
          onSearch={onSearch}
          onCreate={onCreate}
          createLabel="新增店铺"
          onImport={() => setImportOpen(true)}
          onExport={onExport}
          placeholder="搜索店铺名称…"
          rightExtra={
            !isChannelAdmin && (
              <Combobox
                options={channelOptions}
                value={channelId}
                onChange={onChannelChange}
                placeholder="全部渠道"
                searchPlaceholder="搜索渠道名…"
                emptyText="无匹配渠道"
                triggerClassName="h-9 w-48"
                clearable
              />
            )
          }
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={Store}
            title="还没有店铺"
            description="点击右上角「新增店铺」开始"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>店铺</TableHead>
                <TableHead>所属渠道</TableHead>
                <TableHead>归属地区</TableHead>
                <TableHead className="text-center">用户数</TableHead>
                <TableHead className="text-center">测评人次</TableHead>
                <TableHead className="text-center">设备数</TableHead>
                <TableHead className="text-right">销售金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    {r.contact_name && (
                      <div className="text-[11px] text-muted-foreground">
                        {r.contact_name}{r.contact_phone ? ` · ${r.contact_phone}` : ""}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.channels?.name ? <Badge variant="outline">{r.channels.name}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[r.province, r.city, r.district].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link
                      href={`/end-users?store_id=${r.id}`}
                      className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm tabular-nums font-medium transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Users className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                      {r._user_count ?? 0}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" />
                      {r._record_count ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5" />
                      {r.device_count ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/orders?store_id=${r.id}`}
                      className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm tabular-nums font-semibold transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                      {formatMoney(r._revenue || 0)}
                    </Link>
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" /> 编辑
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
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Pagination page={page} pageSize={20} total={total} onChange={p => { setPage(p); reload(q, p, channelId); }} />

      <StoreForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        channels={channels}
        role={role}
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
        title="删除店铺"
        description={`确定要删除「${delTarget?.name}」吗？该店铺下所有终端用户、订单数据都将一并删除。`}
        confirmText="确认删除"
        destructive
        onConfirm={onDelete}
      />
    </Card>
  );
}
