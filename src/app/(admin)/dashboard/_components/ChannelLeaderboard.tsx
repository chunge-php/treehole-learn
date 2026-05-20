"use client";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { Store, Users, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { Building2 } from "lucide-react";

type Row = {
  id: string;
  name: string;
  region?: string;
  stores: number;
  devices: number;
  users: number;
  records: number;
  revenue: number;
};

function Linked({ href, icon: Icon, value, accent }: { href: string; icon: any; value: string | number; accent?: boolean }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm tabular-nums transition-colors hover:bg-primary/10 hover:text-primary"
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
      <span className={accent ? "font-semibold text-primary" : "font-medium"}>{value}</span>
    </Link>
  );
}

export function ChannelLeaderboard({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={Building2} title="暂无渠道" description="新增渠道后这里会展示汇总" />;
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">渠道名</th>
            <th className="px-3 py-2 text-center font-medium">店铺数</th>
            <th className="px-3 py-2 text-center font-medium">用户数</th>
            <th className="px-3 py-2 text-center font-medium">测评人次</th>
            <th className="px-3 py-2 text-center font-medium">设备数</th>
            <th className="px-3 py-2 text-right font-medium">销售金额</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-accent text-[10px] font-medium text-accent-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-medium text-foreground">{r.name}</div>
                    {r.region && <div className="text-[11px] text-muted-foreground">{r.region}</div>}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 text-center">
                <Linked href={`/stores?channel_id=${r.id}`} icon={Store} value={r.stores} />
              </td>
              <td className="px-3 py-2.5 text-center">
                <Linked href={`/end-users?channel_id=${r.id}`} icon={Users} value={r.users} />
              </td>
              <td className="px-3 py-2.5 text-center text-muted-foreground tabular-nums">{r.records}</td>
              <td className="px-3 py-2.5 text-center text-muted-foreground tabular-nums">{r.devices}</td>
              <td className="px-3 py-2.5 text-right">
                <Linked href={`/orders?channel_id=${r.id}`} icon={TrendingUp} value={formatMoney(r.revenue)} accent />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
