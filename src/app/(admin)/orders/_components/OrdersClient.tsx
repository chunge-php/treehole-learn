"use client";
import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataToolbar } from "@/components/admin/DataToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateCN, formatMoney } from "@/lib/utils";
import { ReceiptText, Eye } from "lucide-react";
import { OrderDetailDialog } from "./OrderDetailDialog";
import { listOrders } from "../actions";
import { downloadExcel } from "@/lib/excel";
import { toast } from "sonner";

const PAY_STATUS_OPTIONS: Record<string, { label: string; variant: any }> = {
  pending: { label: "待支付", variant: "warning" },
  paid: { label: "已支付", variant: "success" },
  refunded: { label: "已退款", variant: "info" },
  cancelled: { label: "已取消", variant: "muted" }
};

export function OrdersClient({
  initialRows, initialTotal, initialQ, initialPage, initialPayStatus
}: {
  initialRows: any[];
  initialTotal: number;
  initialQ: string;
  initialPage: number;
  initialPayStatus: string;
}) {
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [payStatus, setPayStatus] = useState(initialPayStatus);
  const [viewing, setViewing] = useState<any>(null);
  const [, start] = useTransition();

  function reload(nextQ = q, nextPage = page, nextStatus = payStatus) {
    start(async () => {
      const { rows: r, total: t } = await listOrders({
        q: nextQ,
        page: nextPage,
        pay_status: nextStatus || undefined,
        pageSize: 20
      });
      setRows(r); setTotal(t);
    });
  }

  function onSearch(v: string) {
    setQ(v); setPage(1);
    reload(v, 1, payStatus);
  }

  function onStatusChange(v: string) {
    const next = v === "__all__" ? "" : v;
    setPayStatus(next); setPage(1);
    reload(q, 1, next);
  }

  function onExport() {
    const data = rows.map(r => ({
      订单号: r.order_no,
      渠道: r.channels?.name || "",
      店铺: r.stores?.name || "",
      用户: r.end_users?.nickname || "",
      用户电话: r.end_users?.phone || "",
      金额: Number(r.amount || 0).toFixed(2),
      支付状态: PAY_STATUS_OPTIONS[r.pay_status]?.label || r.pay_status,
      支付方式: r.pay_method || "",
      支付时间: formatDateCN(r.paid_at),
      创建时间: formatDateCN(r.created_at),
      备注: r.remark || ""
    }));
    downloadExcel(data, `订单导出_${new Date().getTime()}.xlsx`);
    toast.success("已导出当前页数据");
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <DataToolbar
          q={q}
          onSearch={onSearch}
          onExport={onExport}
          placeholder="搜索订单号…"
          rightExtra={
            <Select value={payStatus || "__all__"} onValueChange={onStatusChange}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="全部状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部状态</SelectItem>
                {Object.entries(PAY_STATUS_OPTIONS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="暂无订单"
            description="订单将由外部业务系统流入"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>渠道</TableHead>
                <TableHead>店铺</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>支付方式</TableHead>
                <TableHead>支付时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => {
                const st = PAY_STATUS_OPTIONS[r.pay_status] || { label: r.pay_status, variant: "muted" };
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-mono text-xs font-medium">{r.order_no}</div>
                      <div className="text-[11px] text-muted-foreground">#{r.seq_no}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.channels?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{r.stores?.name || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {r.end_users?.nickname || "—"}
                      {r.end_users?.phone && (
                        <div className="text-[11px] text-muted-foreground">{r.end_users.phone}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">{formatMoney(r.amount)}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.pay_method || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateCN(r.paid_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setViewing(r)}>
                        <Eye className="h-3.5 w-3.5" /> 查看
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Pagination page={page} pageSize={20} total={total} onChange={p => { setPage(p); reload(q, p, payStatus); }} />

      <OrderDetailDialog
        open={!!viewing}
        onOpenChange={v => !v && setViewing(null)}
        order={viewing}
      />
    </Card>
  );
}
