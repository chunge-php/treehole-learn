"use client";
import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataToolbar } from "@/components/admin/DataToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { MoreHorizontal, Pencil, Trash2, Power, ClipboardList } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { AssessmentForm } from "./AssessmentForm";
import { ImportDialog } from "./ImportDialog";
import { deleteAssessment, toggleAssessmentStatus, listAssessments } from "../actions";
import { DIMENSION_LABEL, QTYPE_LABEL, type AssessmentDimension, type AssessmentQType } from "./constants";
import { downloadExcel } from "@/lib/excel";
import { toast } from "sonner";

const DIM_VARIANT: Record<AssessmentDimension, "outline" | "success" | "warning" | "muted"> = {
  learning_attitude: "warning",
  learning_method: "success",
  learning_ability: "outline",
  learning_habit: "muted"
};

export function AssessmentsClient({
  initialRows, initialTotal, initialQ, initialPage, projects
}: {
  initialRows: any[];
  initialTotal: number;
  initialQ: string;
  initialPage: number;
  projects: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [dimension, setDimension] = useState<string>("");
  const [qtype, setQtype] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<any>(null);
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
      题目: r.title,
      维度: DIMENSION_LABEL[r.dimension as AssessmentDimension] || r.dimension,
      题型: QTYPE_LABEL[r.qtype as AssessmentQType] || r.qtype,
      选项: r.options ? JSON.stringify(r.options) : "",
      答案: Array.isArray(r.answer) ? r.answer.join(",") : (r.answer ?? ""),
      解析: r.explanation || "",
      分值: r.score ?? "",
      排序: r.sort_order ?? 0,
      所属项目: r.top_types?.name || "",
      项目ID: r.project_id || "",
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
          placeholder="搜索题目内容…"
          rightExtra={
            <div className="flex items-center gap-2">
              <Select value={dimension || "__all"} onValueChange={v => {
                const nv = v === "__all" ? "" : v;
                setDimension(nv); setPage(1); reload(q, 1, nv, qtype);
              }}>
                <SelectTrigger className="h-9 w-32"><SelectValue placeholder="全部维度" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">全部维度</SelectItem>
                  {(Object.keys(DIMENSION_LABEL) as AssessmentDimension[]).map(k => (
                    <SelectItem key={k} value={k}>{DIMENSION_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={qtype || "__all"} onValueChange={v => {
                const nv = v === "__all" ? "" : v;
                setQtype(nv); setPage(1); reload(q, 1, dimension, nv);
              }}>
                <SelectTrigger className="h-9 w-28"><SelectValue placeholder="全部题型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">全部题型</SelectItem>
                  <SelectItem value="single">单选</SelectItem>
                  <SelectItem value="multiple">多选</SelectItem>
                  <SelectItem value="text">简答</SelectItem>
                </SelectContent>
              </Select>
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
                <TableHead className="w-[34%]">题目</TableHead>
                <TableHead>维度</TableHead>
                <TableHead>题型</TableHead>
                <TableHead>选项数</TableHead>
                <TableHead>分值</TableHead>
                <TableHead>所属项目</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium line-clamp-2">{r.title}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">#{r.seq_no}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={DIM_VARIANT[r.dimension as AssessmentDimension] || "outline"}>
                      {DIMENSION_LABEL[r.dimension as AssessmentDimension] || r.dimension}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{QTYPE_LABEL[r.qtype as AssessmentQType] || r.qtype}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.qtype === "text" ? "—" : (Array.isArray(r.options) ? r.options.length : 0)}
                  </TableCell>
                  <TableCell className="text-sm">{r.score ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.top_types?.name || <span className="text-xs">—</span>}
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

      <Pagination page={page} pageSize={20} total={total} onChange={p => { setPage(p); reload(q, p); }} />

      <AssessmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        projects={projects}
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
        description={`确定要删除该题目「${(delTarget?.title || "").slice(0, 30)}…」吗？此操作不可恢复。`}
        confirmText="确认删除"
        destructive
        onConfirm={onDelete}
      />
    </Card>
  );
}
