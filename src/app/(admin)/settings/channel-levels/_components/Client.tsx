"use client";
import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataToolbar } from "@/components/admin/DataToolbar";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateCN } from "@/lib/utils";
import { MoreHorizontal, Pencil, Trash2, ShieldCheck } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Form } from "./Form";
import { deleteChannelLevel, listChannelLevels } from "../actions";
import { toast } from "sonner";

export function Client({ initialRows }: { initialRows: any[] }) {
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [delTarget, setDelTarget] = useState<any>(null);
  const [, start] = useTransition();

  const filtered = q.trim()
    ? rows.filter(r => (r.name || "").toLowerCase().includes(q.trim().toLowerCase()))
    : rows;

  function reload() {
    start(async () => {
      const r = await listChannelLevels();
      setRows(r);
    });
  }

  function onCreate() { setEditing(null); setFormOpen(true); }
  function onEdit(r: any) { setEditing(r); setFormOpen(true); }

  async function onDelete() {
    if (!delTarget) return;
    try {
      await deleteChannelLevel(delTarget.id);
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
          onSearch={setQ}
          onCreate={onCreate}
          createLabel="新增级别"
          placeholder="搜索级别名称…"
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="还没有渠道级别"
            description="点击右上角「新增级别」开始"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead className="w-24">排序</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="w-44">创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="tabular-nums">{r.rank ?? 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.remark || "—"}</TableCell>
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

      <Form
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSaved={() => reload()}
      />
      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={v => !v && setDelTarget(null)}
        title="删除渠道级别"
        description={`确定要删除「${delTarget?.name}」吗？已使用该级别的渠道商将变为「未指定」。`}
        confirmText="确认删除"
        destructive
        onConfirm={onDelete}
      />
    </Card>
  );
}
