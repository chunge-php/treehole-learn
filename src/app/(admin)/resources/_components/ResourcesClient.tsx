"use client";
import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataToolbar } from "@/components/admin/DataToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateCN } from "@/lib/utils";
import { MoreHorizontal, Pencil, Trash2, Power, Library, FileText, Video, File as FileIcon } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ResourceForm } from "./ResourceForm";
import { ImportDialog } from "./ImportDialog";
import { deleteResource, toggleResourceStatus, listResources } from "../actions";
import { TYPE_LABEL, formatDuration, formatFileSize, type ResourceType } from "./constants";
import { downloadExcel } from "@/lib/excel";
import { toast } from "sonner";

const TYPE_ICON: Record<ResourceType, any> = {
  text: FileText,
  video: Video,
  file: FileIcon
};

export function ResourcesClient({
  initialRows, initialTotal, initialQ, initialPage, initialType, categories
}: {
  initialRows: any[];
  initialTotal: number;
  initialQ: string;
  initialPage: number;
  initialType: string;
  categories: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [activeType, setActiveType] = useState<string>(initialType || "all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<any>(null);
  const [, start] = useTransition();

  function reload(nextQ = q, nextPage = page, nextType = activeType) {
    start(async () => {
      const { rows: r, total: t } = await listResources({
        q: nextQ,
        page: nextPage,
        pageSize: 20,
        type: nextType === "all" ? undefined : nextType
      });
      setRows(r); setTotal(t);
    });
  }

  function onSearch(v: string) {
    setQ(v); setPage(1);
    reload(v, 1);
  }

  function onTabChange(v: string) {
    setActiveType(v); setPage(1);
    reload(q, 1, v);
  }

  function onCreate() { setEditing(null); setFormOpen(true); }
  function onEdit(r: any) { setEditing(r); setFormOpen(true); }

  function onExport() {
    const data = rows.map(r => ({
      标题: r.title,
      类型: TYPE_LABEL[r.type as ResourceType] || r.type,
      分类: r.top_types?.name || "",
      分类ID: r.category_id || "",
      封面: r.cover_url || "",
      正文: r.body || "",
      媒体地址: r.media_url || "",
      时长秒: r.duration_sec ?? "",
      文件大小: r.file_size ?? "",
      扩展名: r.file_ext || "",
      排序: r.sort_order ?? 0,
      状态: r.status === "online" ? "上架" : "下架",
      备注: r.remark || "",
      创建时间: formatDateCN(r.created_at)
    }));
    downloadExcel(data, `资源库导出_${new Date().getTime()}.xlsx`);
    toast.success("已导出当前页数据");
  }

  async function onDelete() {
    if (!delTarget) return;
    try {
      await deleteResource(delTarget.id);
      toast.success("已删除");
      setDelTarget(null);
      reload();
    } catch (e: any) {
      toast.error(e?.message || "删除失败");
    }
  }

  async function onToggle(r: any) {
    try {
      await toggleResourceStatus(r.id, r.status === "online" ? "offline" : "online");
      toast.success(r.status === "online" ? "已下架" : "已上架");
      reload();
    } catch (e: any) {
      toast.error(e?.message || "操作失败");
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs value={activeType} onValueChange={onTabChange}>
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="text"><FileText className="h-3.5 w-3.5" /> 文本</TabsTrigger>
              <TabsTrigger value="video"><Video className="h-3.5 w-3.5" /> 视频</TabsTrigger>
              <TabsTrigger value="file"><FileIcon className="h-3.5 w-3.5" /> 文件</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <DataToolbar
          q={q}
          onSearch={onSearch}
          onCreate={onCreate}
          createLabel="新增资源"
          onImport={() => setImportOpen(true)}
          onExport={onExport}
          placeholder="搜索资源标题…"
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={Library}
            title="还没有资源"
            description="点击右上角「新增资源」开始上传"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[34%]">标题</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>时长/大小</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => {
                const Icon = TYPE_ICON[r.type as ResourceType] || FileText;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.cover_url ? (
                          <img src={r.cover_url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium">{r.title}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">#{r.seq_no}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Icon className="h-3 w-3" /> {TYPE_LABEL[r.type as ResourceType] || r.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.top_types?.name || <span className="text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.type === "video" ? formatDuration(r.duration_sec)
                        : r.type === "file" ? formatFileSize(r.file_size)
                        : "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-sm">{r.sort_order ?? 0}</TableCell>
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
                          <DropdownMenuItem onSelect={() => onToggle(r)}>
                            <Power className="h-3.5 w-3.5" /> {r.status === "online" ? "下架" : "上架"}
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

      <Pagination page={page} pageSize={20} total={total} onChange={p => { setPage(p); reload(q, p); }} />

      <ResourceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        defaultType={activeType === "all" ? "text" : (activeType as ResourceType)}
        categories={categories}
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
        title="删除资源"
        description={`确定要删除「${delTarget?.title || ""}」吗？该资源对应的关联引用也将失效。`}
        confirmText="确认删除"
        destructive
        onConfirm={onDelete}
      />
    </Card>
  );
}
