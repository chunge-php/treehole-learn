"use client";
import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ClipboardList, Plus, Trash2, Loader2, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { formatDateCN } from "@/lib/utils";
import {
  listAssignments,
  createAssignment,
  toggleAssignmentDone,
  deleteAssignment
} from "../assignment-actions";

type Assignment = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  completed_at: string | null;
};

type Filter = "all" | "pending" | "done";

const NAME_MAX = 30;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function plusDays(base: string, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AssignmentsDialog({
  target,
  onOpenChange,
  onChanged
}: {
  target: { id: string; name: string } | null;
  onOpenChange: (v: boolean) => void;
  onChanged?: () => void;
}) {
  const open = !!target;
  const [rows, setRows] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(plusDays(todayStr(), 6));
  const [delTarget, setDelTarget] = useState<Assignment | null>(null);
  const [doneTarget, setDoneTarget] = useState<Assignment | null>(null);
  const [loading, startLoading] = useTransition();
  const [, startMutate] = useTransition();

  useEffect(() => {
    if (!open || !target) return;
    setAddOpen(false);
    setFilter("pending");
    load("pending");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.id]);

  function load(f: Filter = filter) {
    if (!target) return;
    startLoading(async () => {
      try {
        const data = await listAssignments({ end_user_id: target.id, status: f });
        setRows(data as any);
      } catch (e: any) {
        toast.error(e?.message || "加载失败");
      }
    });
  }

  function onFilterChange(f: Filter) {
    setFilter(f);
    load(f);
  }

  function openAdd() {
    setName("");
    setStartDate(todayStr());
    setEndDate(plusDays(todayStr(), 6));
    setAddOpen(true);
  }

  function onSubmit() {
    if (!target) return;
    const trimmed = name.trim();
    if (!trimmed) { toast.error("请填写任务名称"); return; }
    if (trimmed.length > NAME_MAX) { toast.error(`任务名称最多 ${NAME_MAX} 字`); return; }
    if (startDate > endDate) { toast.error("结束日期不能早于开始日期"); return; }
    startMutate(async () => {
      try {
        await createAssignment({ end_user_id: target.id, name: trimmed, start_date: startDate, end_date: endDate });
        toast.success("已添加");
        setAddOpen(false);
        load();
        onChanged?.();
      } catch (e: any) {
        toast.error(e?.message || "添加失败");
      }
    });
  }

  function onCheckToggle(a: Assignment, next: boolean) {
    if (next) {
      // 标记完成 → 先确认
      setDoneTarget(a);
    } else {
      // 取消完成 → 直接执行
      runToggle(a, false);
    }
  }

  function runToggle(a: Assignment, done: boolean) {
    startMutate(async () => {
      try {
        await toggleAssignmentDone(a.id, done);
        load();
        onChanged?.();
      } catch (e: any) {
        toast.error(e?.message || "更新失败");
      }
    });
  }

  function onConfirmDone() {
    if (!doneTarget) return;
    const a = doneTarget;
    setDoneTarget(null);
    runToggle(a, true);
  }

  function onDelete() {
    if (!delTarget) return;
    startMutate(async () => {
      try {
        await deleteAssignment(delTarget.id);
        toast.success("已删除");
        setDelTarget(null);
        load();
        onChanged?.();
      } catch (e: any) {
        toast.error(e?.message || "删除失败");
      }
    });
  }

  const pendingCount = rows.filter(r => !r.completed_at).length;
  const doneCount = rows.filter(r => !!r.completed_at).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <DialogTitle className="mt-2">作业管理 · 「{target?.name}」</DialogTitle>
            <DialogDescription>
              为该学员安排周期任务，家长端可在小程序中查看与打卡完成。
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              {(["pending", "done", "all"] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => onFilterChange(f)}
                  className={
                    "rounded-md px-2.5 py-1 transition " +
                    (filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
                  }
                >
                  {f === "pending" ? "未完成" : f === "done" ? "已完成" : "全部"}
                  {filter === f && rows.length > 0 && (
                    <span className="ml-1 opacity-80">({rows.length})</span>
                  )}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">
              未完成 {pendingCount} · 已完成 {doneCount}
            </span>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> 添加任务
            </Button>
          </div>

          <div className="max-h-[55vh] min-h-[20vh] overflow-y-auto -mx-1 px-1">
            {loading ? (
              <div className="py-10 flex items-center justify-center text-muted-foreground text-sm">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载中…
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={filter === "done" ? "暂无已完成任务" : filter === "pending" ? "暂无未完成任务" : "还没有任务"}
                description="点击右上角「添加任务」创建第一个任务"
              />
            ) : (
              <ul className="divide-y rounded-md border">
                {rows.map(a => {
                  const done = !!a.completed_at;
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                      <Checkbox
                        checked={done}
                        onCheckedChange={v => onCheckToggle(a, !!v)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className={"text-sm truncate " + (done ? "line-through text-muted-foreground" : "")}>
                          {a.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <CalendarRange className="h-3 w-3" />
                          {a.start_date} ~ {a.end_date}
                          {done && a.completed_at && (
                            <Badge variant="outline" className="ml-2 text-[10px] border-success/40 text-success">
                              {formatDateCN(a.completed_at)} 完成
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground/60 hover:text-destructive"
                        onClick={() => setDelTarget(a)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 添加任务子弹窗 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增任务</DialogTitle>
            <DialogDescription>为「{target?.name}」安排一个周期任务。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">任务名称</Label>
                <span className={"text-[11px] " + (name.length > NAME_MAX ? "text-destructive" : "text-muted-foreground")}>
                  {name.length}/{NAME_MAX}
                </span>
              </div>
              <Input
                value={name}
                maxLength={NAME_MAX}
                onChange={e => setName(e.target.value)}
                placeholder="如：每日朗读 20 分钟"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">开始日期</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">结束日期</Label>
                <Input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
            <Button onClick={onSubmit}>
              <Plus className="h-4 w-4" /> 添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!doneTarget}
        onOpenChange={v => !v && setDoneTarget(null)}
        title="标记为已完成"
        description={`确定将任务「${doneTarget?.name}」标记为已完成吗？`}
        confirmText="确认完成"
        onConfirm={onConfirmDone}
      />

      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={v => !v && setDelTarget(null)}
        title="删除任务"
        description={`确定删除任务「${delTarget?.name}」吗？`}
        confirmText="删除"
        destructive
        onConfirm={onDelete}
      />
    </>
  );
}
