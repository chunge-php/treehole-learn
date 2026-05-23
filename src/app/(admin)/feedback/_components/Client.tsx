"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { MessageSquare, Trash2, CheckCircle2, RotateCcw, Phone } from "lucide-react";
import { formatDateCN } from "@/lib/utils";
import { listFeedback, deleteFeedback, setFeedbackStatus, type FeedbackRow } from "../actions";

export function Client({ initialRows }: { initialRows: FeedbackRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [delTarget, setDelTarget] = useState<FeedbackRow | null>(null);
  const [, startMutate] = useTransition();

  async function refresh() {
    try {
      setRows(await listFeedback());
    } catch (e: any) {
      toast.error(e?.message || "刷新失败");
    }
  }

  function onToggleStatus(f: FeedbackRow) {
    const next = f.status === "resolved" ? "pending" : "resolved";
    startMutate(async () => {
      try {
        await setFeedbackStatus(f.id, next);
        toast.success(next === "resolved" ? "已标记处理" : "已恢复待处理");
        refresh();
      } catch (e: any) {
        toast.error(e?.message || "操作失败");
      }
    });
  }

  function onDelete() {
    if (!delTarget) return;
    const id = delTarget.id;
    setDelTarget(null);
    startMutate(async () => {
      try {
        await deleteFeedback(id);
        toast.success("已删除");
        refresh();
      } catch (e: any) {
        toast.error(e?.message || "删除失败");
      }
    });
  }

  if (rows.length === 0) {
    return (
      <EmptyState icon={MessageSquare} title="暂无反馈" description="家长端提交的反馈会显示在这里" />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {rows.map(f => (
          <Card key={f.id} className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                {f.parentAvatar && <AvatarImage src={f.parentAvatar} alt="" />}
                <AvatarFallback className="bg-gradient-to-br from-sky-300 to-blue-500 text-white font-semibold">{(f.parentNickname || "家").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{f.parentNickname || "未设昵称家长"}</span>
                  {f.parentPhone && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Phone className="h-3 w-3" />{f.parentPhone}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={f.status === "resolved" ? "border-success/40 text-success" : "border-amber-500/40 text-amber-600 dark:text-amber-400"}
                  >
                    {f.status === "resolved" ? "已处理" : "待处理"}
                  </Badge>
                  <span className="ml-auto text-[11px] text-muted-foreground">{formatDateCN(f.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{f.content}</p>
                {f.contact && (
                  <p className="mt-1.5 text-xs text-muted-foreground">联系方式：{f.contact}</p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => onToggleStatus(f)}>
                    {f.status === "resolved"
                      ? (<><RotateCcw className="h-3.5 w-3.5" /> 恢复待处理</>)
                      : (<><CheckCircle2 className="h-3.5 w-3.5" /> 标记已处理</>)}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setDelTarget(f)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> 删除
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={v => !v && setDelTarget(null)}
        title="删除反馈"
        description="确定删除这条反馈吗？删除后无法恢复。"
        confirmText="删除"
        destructive
        onConfirm={onDelete}
      />
    </>
  );
}
