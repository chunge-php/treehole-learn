"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDateCN, formatMoney } from "@/lib/utils";

const PAY_STATUS_LABEL: Record<string, { label: string; variant: any }> = {
  pending: { label: "待支付", variant: "warning" },
  paid: { label: "已支付", variant: "success" },
  refunded: { label: "已退款", variant: "info" },
  cancelled: { label: "已取消", variant: "muted" }
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-all">{value ?? "—"}</span>
    </div>
  );
}

export function OrderDetailDialog({ open, onOpenChange, order }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: any;
}) {
  const st = order ? (PAY_STATUS_LABEL[order.pay_status] || { label: order.pay_status, variant: "muted" }) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>订单详情</DialogTitle>
        </DialogHeader>
        {order && (
          <div className="max-h-[60vh] overflow-y-auto px-1">
            <div className="rounded-lg bg-muted/30 p-3 mb-3">
              <div className="text-xs text-muted-foreground">订单号</div>
              <div className="font-mono text-sm font-semibold">{order.order_no}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">序号 #{order.seq_no}</div>
            </div>
            <Row label="支付状态" value={st && <Badge variant={st.variant}>{st.label}</Badge>} />
            <Row label="订单金额" value={<span className="text-lg font-semibold text-primary">{formatMoney(order.amount)}</span>} />
            <Row label="支付方式" value={order.pay_method} />
            <Row label="支付时间" value={formatDateCN(order.paid_at)} />
            <Separator className="my-2" />
            <Row label="所属渠道" value={order.channels?.name} />
            <Row label="所属店铺" value={order.stores?.name} />
            <Row label="下单用户" value={order.end_users?.name} />
            <Row label="用户电话" value={order.end_users?.phone} />
            <Separator className="my-2" />
            <Row label="创建时间" value={formatDateCN(order.created_at)} />
            <Row label="备注" value={order.remark} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
