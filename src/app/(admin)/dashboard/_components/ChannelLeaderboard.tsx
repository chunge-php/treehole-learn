"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { Store, Users, TrendingUp, Search, Loader2, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/admin/EmptyState";
import { Pagination } from "@/components/admin/Pagination";
import { getChannelSummary, type ChannelSummaryRow } from "../actions";

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

export function ChannelLeaderboard({
  initialRows,
  initialTotal,
  pageSize = 10
}: {
  initialRows: ChannelSummaryRow[];
  initialTotal: number;
  pageSize?: number;
}) {
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pending, start] = useTransition();

  function reload(nextQ = q, nextPage = page) {
    start(async () => {
      const r = await getChannelSummary({ q: nextQ, page: nextPage, pageSize });
      setRows(r.rows);
      setTotal(r.total);
    });
  }

  function onSearch(v: string) {
    setQ(v); setPage(1);
    reload(v, 1);
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => onSearch(e.target.value)}
            placeholder="搜索渠道名称…"
            className="h-9 pl-8"
          />
        </div>
        {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto text-xs text-muted-foreground">
          共 <span className="font-medium text-foreground tabular-nums">{total}</span> 个渠道
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={q ? "无匹配渠道" : "暂无渠道"}
          description={q ? "调整搜索词试试" : "新增渠道后这里会展示汇总"}
        />
      ) : (
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
                        {(page - 1) * pageSize + i + 1}
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
      )}

      <div className="-mx-6 -mb-6 mt-3">
        <Pagination page={page} pageSize={pageSize} total={total} onChange={p => { setPage(p); reload(q, p); }} />
      </div>
    </div>
  );
}
