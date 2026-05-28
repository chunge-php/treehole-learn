"use client";
import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { ArrowLeft, Plus, FileBarChart, Trash2, Pencil, Eye, Loader2, RefreshCw } from "lucide-react";
import { createReportSession, deleteReportSession, listEndUsersForSelect, resyncReportToProfile, type ReportSessionRow } from "../actions";
import { toast } from "sonner";

type EndUserOpt = { id: string; name: string; phone: string; grade: string; store?: string; channel?: string };

export function ReportsClient({ initialRows }: { initialRows: ReportSessionRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [createOpen, setCreateOpen] = useState(false);
  const [endUserId, setEndUserId] = useState("");
  const [endUsers, setEndUsers] = useState<EndUserOpt[]>([]);
  const [remark, setRemark] = useState("");
  const [pending, start] = useTransition();
  const [delTarget, setDelTarget] = useState<ReportSessionRow | null>(null);
  const [delPending, startDel] = useTransition();
  const [resyncingId, setResyncingId] = useState<string | null>(null);

  async function onResync(id: string) {
    setResyncingId(id);
    try {
      const r = await resyncReportToProfile(id);
      if (r.ok) toast.success(r.message + (r.fields_in_report.length ? ` · 包含: ${r.fields_in_report.join(", ")}` : ""));
      else toast.error(r.message);
    } catch (e: any) { toast.error(e?.message || "同步失败"); }
    finally { setResyncingId(null); }
  }

  useEffect(() => {
    if (createOpen && endUsers.length === 0) {
      listEndUsersForSelect().then(setEndUsers).catch(() => toast.error("加载学生失败"));
    }
  }, [createOpen, endUsers.length]);

  function submitCreate() {
    if (!endUserId) { toast.error("请选择受测学生"); return; }
    start(async () => {
      try {
        const { id } = await createReportSession({ end_user_id: endUserId, remark });
        toast.success("已创建, 开始作答");
        setCreateOpen(false); setEndUserId(""); setRemark("");
        router.push(`/tests/reports/${id}`);
      } catch (e: any) {
        toast.error(e?.message || "创建失败");
      }
    });
  }

  function onDelete() {
    if (!delTarget) return;
    startDel(async () => {
      try {
        await deleteReportSession(delTarget.id);
        toast.success("已删除");
        setRows(rs => rs.filter(r => r.id !== delTarget.id));
        setDelTarget(null);
      } catch (e: any) {
        toast.error(e?.message || "删除失败");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/assessments">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> 返回题库</Button>
        </Link>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> 新建测评</Button>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={FileBarChart}
            title="还没有测评记录"
            description="点击右上角「新建测评」, 逐题作答后生成报告"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>记录名称</TableHead>
                <TableHead className="w-[28%]">作答进度</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => {
                const pct = r.total_questions ? Math.round((r.answered_count / r.total_questions) * 100) : 0;
                const done = r.status === "completed";
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      {r.remark && <div className="text-xs text-muted-foreground mt-0.5">{r.remark}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden max-w-[140px]">
                          <div
                            className={`h-full rounded-full ${done ? "bg-success" : "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                          {r.answered_count}/{r.total_questions}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {done
                        ? <Badge variant="success">已完成</Badge>
                        : <Badge variant="warning">作答中</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("zh-CN", { hour12: false })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {done ? (
                          <>
                            <Link href={`/tests/reports/${r.id}/result`}>
                              <Button variant="outline" size="sm"><Eye className="h-3.5 w-3.5" /> 查看报告</Button>
                            </Link>
                            <Button variant="ghost" size="sm" disabled={resyncingId === r.id} onClick={() => onResync(r.id)} title="重新把报告结果同步到学生档案">
                              {resyncingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} 同步档案
                            </Button>
                            <Link href={`/tests/reports/${r.id}`}>
                              <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /> 复核</Button>
                            </Link>
                          </>
                        ) : (
                          <Link href={`/tests/reports/${r.id}`}>
                            <Button variant="outline" size="sm"><Pencil className="h-3.5 w-3.5" /> 继续答题</Button>
                          </Link>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDelTarget(r)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* 新建 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建测评记录</DialogTitle>
            <DialogDescription>将快照当前所有「启用」题目, 创建后逐题作答</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>受测学生 <span className="text-destructive">*</span></Label>
              <Combobox
                options={endUsers.map(u => ({
                  value: u.id,
                  label: u.name,
                  hint: [u.grade, u.store || u.channel, u.phone].filter(Boolean).join(" · ")
                }))}
                value={endUserId}
                onChange={v => setEndUserId(v)}
                placeholder="选择学生 (按姓名或手机搜索)"
                searchPlaceholder="搜索姓名/手机…"
                emptyText="没有匹配的学生"
              />
            </div>
            <div className="space-y-1.5">
              <Label>备注</Label>
              <Textarea value={remark} onChange={e => setRemark(e.target.value)} rows={2} placeholder="可选" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={submitCreate} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} 创建并开始
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={v => !v && setDelTarget(null)}
        title="删除测评记录"
        description={delTarget ? `确定删除「${delTarget.name}」? 该记录的所有作答将一并删除, 不可恢复。` : ""}
        destructive
        loading={delPending}
        confirmText="删除"
        onConfirm={onDelete}
      />
    </div>
  );
}
