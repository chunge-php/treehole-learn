"use client";
import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DataToolbar } from "@/components/admin/DataToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { MoreHorizontal, Pencil, Trash2, Power, ClipboardList, Image as ImageIcon, Video as VideoIcon, AlertTriangle, Loader2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { AssessmentForm } from "./AssessmentForm";
import { ImportDialog } from "./ImportDialog";
import { deleteAssessment, toggleAssessmentStatus, listAssessments, clearAllAssessments } from "../actions";
import { DIMENSIONS, QTYPES, DIMENSION_VARIANT, QTYPE_VARIANT } from "./constants";
import { downloadExcel } from "@/lib/excel";
import { toast } from "sonner";

export function AssessmentsClient({
  initialRows, initialTotal, initialQ, initialPage, projectSuggestions
}: {
  initialRows: any[];
  initialTotal: number;
  initialQ: string;
  initialPage: number;
  projectSuggestions: string[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [dimension, setDimension] = useState<string | null>(null);
  const [qtype, setQtype] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<any>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearText, setClearText] = useState("");
  const [clearPending, startClear] = useTransition();
  const [, start] = useTransition();

  function reload(nextQ = q, nextPage = page, nextDim = dimension, nextQt = qtype) {
    start(async () => {
      const { rows: r, total: t } = await listAssessments({
        q: nextQ, page: nextPage, pageSize: 20,
        dimension: nextDim || undefined,
        qtype: nextQt || undefined
      });
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
      序号: r.sort_order ?? 0,
      题目标题: r.title,
      描述: r.description || "",
      封面: r.cover_url || "",
      所属维度: r.dimension,
      题型: r.qtype,
      题目内容: r.options ? JSON.stringify(r.options) : "",
      答案: r.answer || "",
      题目文件: (Array.isArray(r.media_urls) ? r.media_urls : [])
        .map((m: any) => m.url)
        .filter(Boolean)
        .join(","),
      所属项目: r.project_name || "",
      状态: r.status === "active" ? "正常" : "停用"
    }));
    downloadExcel(data, `测评题库导出_${new Date().getTime()}.xlsx`);
    toast.success("已导出当前页数据");
  }

  async function onDelete() {
    if (!delTarget) return;
    try {
      await deleteAssessment(delTarget.id);
      toast.success("已删除");
      setDelTarget(null);
      reload();
    } catch (e: any) {
      toast.error(e?.message || "删除失败");
    }
  }

  async function onToggle(r: any) {
    try {
      await toggleAssessmentStatus(r.id, r.status === "active" ? "disabled" : "active");
      toast.success(r.status === "active" ? "已停用" : "已启用");
      reload();
    } catch (e: any) {
      toast.error(e?.message || "操作失败");
    }
  }

  function submitClear() {
    if (clearText !== "确认清空") { toast.error("请输入'确认清空'"); return; }
    startClear(async () => {
      try {
        const r = await clearAllAssessments(clearText);
        toast.success(`已清空 ${r.removed} 条测评题`);
        setClearOpen(false); setClearText("");
        setPage(1);
        reload(q, 1);
      } catch (e: any) {
        toast.error(e?.message || "清空失败");
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
          createLabel="新增题目"
          onImport={() => setImportOpen(true)}
          onExport={onExport}
          placeholder="搜索题目标题/描述/项目…"
          rightExtra={
            <div className="flex items-center gap-2">
              <Combobox
                options={DIMENSIONS.map(d => ({ value: d, label: d }))}
                value={dimension}
                onChange={v => { setDimension(v); setPage(1); reload(q, 1, v, qtype); }}
                placeholder="全部维度"
                triggerClassName="h-9 w-36"
                searchPlaceholder="搜索维度…"
                emptyText="无匹配"
                clearable
              />
              {total > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => { setClearText(""); setClearOpen(true); }}
                  title="清空所有测评题 (用于导错重置)"
                >
                  <Trash2 className="h-3.5 w-3.5" /> 清空
                </Button>
              )}
              <Combobox
                options={QTYPES.map(q => ({ value: q, label: q }))}
                value={qtype}
                onChange={v => { setQtype(v); setPage(1); reload(q, 1, dimension, v); }}
                placeholder="全部题型"
                triggerClassName="h-9 w-32"
                searchPlaceholder="搜索题型…"
                emptyText="无匹配"
                clearable
              />
            </div>
          }
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="还没有测评题"
            description="点击右上角「新增题目」开始创建"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">序号</TableHead>
                <TableHead className="w-[32%]">题目</TableHead>
                <TableHead>维度</TableHead>
                <TableHead>题型</TableHead>
                <TableHead className="text-center">选项</TableHead>
                <TableHead className="text-center">文件</TableHead>
                <TableHead>所属项目</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => {
                const media = Array.isArray(r.media_urls) ? r.media_urls : [];
                const imgCount = media.filter((m: any) => (m.type || "").startsWith("image/")).length;
                const videoCount = media.filter((m: any) => (m.type || "").startsWith("video/")).length;
                return (
                <TableRow key={r.id}>
                  <TableCell className="text-center font-mono text-sm tabular-nums text-muted-foreground">{r.sort_order ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-start gap-2.5">
                      {r.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.cover_url} alt="" className="h-10 w-10 rounded object-cover bg-muted shrink-0" onError={(e: any) => { e.target.style.display = "none"; }} />
                      ) : null}
                      <div className="min-w-0">
                        <div className="font-medium line-clamp-2">{r.title}</div>
                        {r.description && <div className="text-[11px] text-muted-foreground line-clamp-1">{r.description}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={DIMENSION_VARIANT[r.dimension] || "outline"}>{r.dimension}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={QTYPE_VARIANT[r.qtype] || "outline"}>{r.qtype}</Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
                    {r.qtype === "语音题" ? "—" : (Array.isArray(r.options) ? r.options.length : 0)}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {imgCount + videoCount === 0 ? (
                      <span className="opacity-40">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        {imgCount > 0 && <span className="inline-flex items-center gap-0.5"><ImageIcon className="h-3 w-3" />{imgCount}</span>}
                        {videoCount > 0 && <span className="inline-flex items-center gap-0.5"><VideoIcon className="h-3 w-3" />{videoCount}</span>}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.project_name || <span className="text-xs">—</span>}
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
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Pagination page={page} pageSize={20} total={total} onChange={p => { setPage(p); reload(q, p); }} />

      <AssessmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        projectSuggestions={projectSuggestions}
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
        title="删除测评题"
        description={`确定要删除该题目「${(delTarget?.title || "").slice(0, 30)}」吗？此操作不可恢复。`}
        confirmText="确认删除"
        destructive
        onConfirm={onDelete}
      />

      {/* 清空全部弹窗 (需输入'确认清空' 才能执行) */}
      <Dialog open={clearOpen} onOpenChange={v => { setClearOpen(v); if (!v) setClearText(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="mt-2">清空所有测评题</DialogTitle>
            <DialogDescription className="leading-relaxed">
              将删除当前数据库中全部 <b className="text-destructive tabular-nums">{total}</b> 条测评题, 此操作 <b>不可恢复</b>。
              <br />关联的测评作答记录 (assessment_records) 会被自动清空。
              <br />继续请输入 <code className="font-mono text-destructive">确认清空</code>:
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={clearText}
              onChange={e => setClearText(e.target.value)}
              placeholder="确认清空"
              autoFocus
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)} disabled={clearPending}>取消</Button>
            <Button
              variant="destructive"
              onClick={submitClear}
              disabled={clearText !== "确认清空" || clearPending}
            >
              {clearPending && <Loader2 className="h-4 w-4 animate-spin" />}
              确认清空全部
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
