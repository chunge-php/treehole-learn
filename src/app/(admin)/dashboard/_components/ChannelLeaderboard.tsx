"use client";
import { formatMoney } from "@/lib/utils";
import { Building2 } from "lucide-react";

type Row = { id: string; name: string; region?: string; stores: number; users: number; paid: number };

export function ChannelLeaderboard({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <div className="py-8 text-center text-xs text-muted-foreground">暂无渠道数据</div>;
  }
  const maxUsers = Math.max(1, ...rows.map(r => r.users));
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.id} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-accent text-[10px] font-medium text-accent-foreground">
                {i + 1}
              </span>
              <span className="font-medium text-foreground">{r.name}</span>
              {r.region && <span className="text-muted-foreground">{r.region}</span>}
            </span>
            <span className="tabular-nums text-muted-foreground">{r.users} 用户 · {r.stores} 店</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-primary to-info transition-all"
                style={{ width: `${(r.users / maxUsers) * 100}%` }}
              />
            </div>
            <span className="w-20 text-right text-[11px] tabular-nums text-muted-foreground">{formatMoney(r.paid)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
