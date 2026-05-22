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
import { formatDateCN } from "@/lib/utils";
import { MoreHorizontal, Pencil, Trash2, Power, Building2, Store, Users } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { ChannelForm } from "./ChannelForm";
import { ImportDialog } from "./ImportDialog";
import { deleteChannel, toggleChannelStatus, listChannels } from "../actions";
import { downloadExcel } from "@/lib/excel";
import { toast } from "sonner";

export function ChannelsClient({
  initialRows, initialTotal, initialQ, initialPage, levels
}: {
  initialRows: any[];
  initialTotal: number;
  initialQ: string;
  initialPage: number;
  levels: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<any>(null);
  const [pending, start] = useTransition();

  function reload(nextQ = q, nextPage = page) {
    start(async () => {
      const { rows: r, total: t } = await listChannels({ q: nextQ, page: nextPage, pageSize: 20 });
      setRows(r); setTotal(t);
    });
  }

  function onSearch(v: string) {
    setQ(v); setPage(1);
    reload(v, 1);
  }

  function onCreate() { setEditing(null); setFormOpen(true); }
  function onEdit(r: any) { setEditing(r); setFormOpen(true); }

  function onExport() {
    const data = rows.map(r => ({
      渠道名称: r.name,
      编号: r.seq_no ?? "",
      级别: r.channel_levels?.name || "",
      归属地区: [r.province, r.city, r.district].filter(Boolean).join(" · "),
      详细地址: r.address || "",
      联系人: r.contact_name || "",
      联系电话: r.contact_phone || "",
      店铺数: r._store_count ?? 0,
      用户数: r._user_count ?? 0,
      状态: r.status === "active" ? "正常" : "停用",
      创建时间: formatDateCN(r.created_at)
    }));
    downloadExcel(data, `渠道商导出_${new Date().getTime()}.xlsx`);
    toast.success("已导出当前页数据");
  }

  async function onDelete() {
    if (!delTarget) return;
    try {
      await deleteChannel(delTarget.id);
      toast.success("已删除");
      setDelTarget(null);
      reload();
    } catch (e: any) {
      toast.error(e?.message || "删除失败");
    }
  }

  async function onToggle(r: any) {
    try {
      await toggleChannelStatus(r.id, r.status === "active" ? "disabled" : "active");
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
          createLabel="新增渠道商"
          onImport={() => setImportOpen(true)}
          onExport={onExport}
          placeholder="搜索渠道名称…"
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="还没有渠道商"
            description="点击右上角「新增渠道商」开始"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>渠道</TableHead>
                <TableHead>级别</TableHead>
                <TableHead>归属地区 / 详细地址</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead className="text-center">店铺</TableHead>
                <TableHead className="text-center">用户</TableHead>
                <TableHead>状态</TableHead>
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
                    {r.channel_levels?.name ? <Badge variant="outline">{r.channel_levels.name}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">{[r.province, r.city, r.district].filter(Boolean).join(" · ") || "—"}</div>
                    {r.address && <div className="text-[11px] text-muted-foreground/80 max-w-[220px] truncate" title={r.address}>{r.address}</div>}
                  </TableCell>
                  <TableCell>
                    {r.contact_name ? (
                      <div className="text-sm">
                        {r.contact_name}
                        <div className="text-[11px] text-muted-foreground">{r.contact_phone}</div>
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link
                      href={`/stores?channel_id=${r.id}`}
                      className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm tabular-nums font-medium transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Store className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                      {r._store_count ?? 0}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Link
                      href={`/end-users?channel_id=${r.id}`}
                      className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm tabular-nums font-medium transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Users className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                      {r._user_count ?? 0}
                    </Link>
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateCN(r.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="truncate max-w-[12rem]">「{r.name}」</DropdownMenuLabel>
                        <DropdownMenuSeparator />
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

      <Pagination page={page} pageSize={20} total={total} onChange={p => { setPage(p); reload(q, p); }} />

      <ChannelForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        levels={levels}
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
        title="删除渠道商"
        description={`确定要删除「${delTarget?.name}」吗？\n· 此渠道的店铺/用户/订单/测评记录将保留 (关联字段变为「未关联」)\n· 此渠道的登录账号会被一并删除`}
        confirmText="确认删除"
        destructive
        onConfirm={onDelete}
      />
    </Card>
  );
}
