"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataToolbar } from "@/components/admin/DataToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateCN, formatMoney } from "@/lib/utils";
import { MoreHorizontal, Pencil, Trash2, Users, Filter, X } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { EndUserForm } from "./EndUserForm";
import { ImportDialog } from "./ImportDialog";
import { deleteEndUser, listEndUsers } from "../actions";
import { downloadExcel } from "@/lib/excel";
import { toast } from "sonner";

const GENDER_LABEL: Record<string, string> = { male: "男", female: "女", other: "其他" };

export function EndUsersClient({
  initialRows, initialTotal, initialQ, initialPage, initialChannelId, initialChannelName, initialStoreId, stores
}: {
  initialRows: any[];
  initialTotal: number;
  initialQ: string;
  initialPage: number;
  initialChannelId?: string | null;
  initialChannelName?: string | null;
  initialStoreId?: string | null;
  stores: { id: string; name: string; channel_id: string; channels?: { name: string } }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [channelId, setChannelId] = useState<string | null>(initialChannelId || null);
  const [channelName] = useState<string | null>(initialChannelName || null);
  const [storeId, setStoreId] = useState<string | null>(initialStoreId || null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<any>(null);
  const [, start] = useTransition();

  const filteredStore = storeId ? stores.find(s => s.id === storeId) : null;

  function reload(nextQ = q, nextPage = page, nextChannelId = channelId, nextStoreId = storeId) {
    start(async () => {
      const { rows: r, total: t } = await listEndUsers({ q: nextQ, channel_id: nextChannelId, store_id: nextStoreId, page: nextPage, pageSize: 20 });
      setRows(r); setTotal(t);
    });
  }

  function clearFilters() {
    setChannelId(null); setStoreId(null); setPage(1);
    router.replace("/end-users");
    reload(q, 1, null, null);
  }

  function onSearch(v: string) {
    setQ(v); setPage(1);
    reload(v, 1);
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
          placeholder="搜索姓名/电话…"
        />

        {(channelName || filteredStore) && (
          <div className="-mt-1 mb-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-accent/40 px-3 py-2 text-xs">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">已筛选：</span>
            {channelName && <Badge variant="default" className="font-medium">渠道 · {channelName}</Badge>}
            {filteredStore && <Badge variant="default" className="font-medium">店铺 · {filteredStore.name}</Badge>}
            <button
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3 w-3" /> 清除筛选
            </button>
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="还没有普通用户"
            description="点击右上角「新增用户」或批量导入开始"
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
