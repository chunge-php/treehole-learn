"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Smartphone, X } from "lucide-react";
import { formatDateCN, maskPhone } from "@/lib/utils";
import { listMpParents, adminUnbind, type MpParentRow } from "../actions";

export function Client({ initialRows }: { initialRows: MpParentRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [unbindTarget, setUnbindTarget] = useState<{ parentId: string; endUserId: string; name: string; nickname: string } | null>(null);
  const [, startMutate] = useTransition();

  async function refresh() {
    try {
      setRows(await listMpParents());
    } catch (e: any) {
      toast.error(e?.message || "刷新失败");
    }
  }

  function onConfirmUnbind() {
    if (!unbindTarget) return;
    const t = unbindTarget;
    setUnbindTarget(null);
    startMutate(async () => {
      try {
        await adminUnbind(t.parentId, t.endUserId);
        toast.success("已解绑");
        refresh();
      } catch (e: any) {
        toast.error(e?.message || "解绑失败");
      }
    });
  }

  if (rows.length === 0) {
    return <EmptyState icon={Smartphone} title="暂无微信用户" description="家长在小程序登录后会显示在这里" />;
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>微信用户</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>绑定学员</TableHead>
              <TableHead>最近登录</TableHead>
              <TableHead>注册时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(p => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      {p.avatar && <AvatarImage src={p.avatar} alt="" />}
                      <AvatarFallback>{(p.nickname || "家").slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{p.nickname || <span className="text-muted-foreground">未设昵称</span>}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {p.phone ? maskPhone(p.phone) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {p.bindings.length === 0 ? (
                    <span className="text-muted-foreground text-xs">未绑定</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {p.bindings.map(b => (
                        <Badge
                          key={b.endUserId}
                          variant="outline"
                          className="cursor-pointer gap-1 hover:border-destructive/50 hover:text-destructive"
                          onClick={() => setUnbindTarget({ parentId: p.id, endUserId: b.endUserId, name: b.name, nickname: p.nickname || "该用户" })}
                          title="点击解绑"
                        >
                          {b.name}
                          <X className="h-3 w-3 opacity-60" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {p.lastLoginAt ? formatDateCN(p.lastLoginAt) : <span className="opacity-60">从未登录</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDateCN(p.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!unbindTarget}
        onOpenChange={v => !v && setUnbindTarget(null)}
        title="解除绑定"
        description={`确定解除「${unbindTarget?.nickname}」与学员「${unbindTarget?.name}」的绑定吗？解绑后该学员可被其他家长绑定。`}
        confirmText="解绑"
        destructive
        onConfirm={onConfirmUnbind}
      />
    </>
  );
}
