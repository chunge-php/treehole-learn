import { getCurrentSession } from "@/lib/session";
import { adminSupabase } from "@/lib/supabase/admin";
import { scopedChannelFilter } from "@/lib/scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Store, Users, BookOpen, ReceiptText, Smartphone, Activity, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { ChannelLeaderboard } from "./_components/ChannelLeaderboard";
import { TrendChart } from "./_components/TrendChart";

export default async function DashboardPage() {
  const session = getCurrentSession()!;
  const sb = adminSupabase();
  const scopedCh = scopedChannelFilter(session);

  // 用并行查询拿统计
  const q = (table: string) => {
    let qb = sb.from(table).select("id", { count: "exact", head: true });
    if (scopedCh && scopedCh !== "__none__" && (table === "stores" || table === "end_users" || table === "orders")) {
      qb = qb.eq("channel_id", scopedCh);
    }
    return qb;
  };

  const [channelsRes, storesRes, usersRes, ordersRes, assessRes, resRes] = await Promise.all([
    sb.from("channels").select("id", { count: "exact", head: true }),
    q("stores"),
    q("end_users"),
    q("orders"),
    sb.from("assessments").select("id", { count: "exact", head: true }),
    sb.from("resources").select("id", { count: "exact", head: true })
  ]);

  // 累计收入
  let revenueQuery = sb.from("orders").select("amount").eq("pay_status", "paid");
  if (scopedCh && scopedCh !== "__none__") revenueQuery = revenueQuery.eq("channel_id", scopedCh);
  const { data: revenueRows } = await revenueQuery;
  const totalRevenue = (revenueRows || []).reduce((s, r) => s + Number(r.amount || 0), 0);

  // 渠道汇总（top 10 by store_count + end_user_count）
  let chQuery = sb.from("channels").select("id, name, province, city");
  const { data: channelList = [] } = await chQuery.limit(50);
  const channelIds = (channelList || []).map(c => c.id);
  const [storeCounts, userCounts] = await Promise.all([
    sb.from("stores").select("channel_id").in("channel_id", channelIds.length ? channelIds : ["__none__"]),
    sb.from("end_users").select("channel_id, paid_amount").in("channel_id", channelIds.length ? channelIds : ["__none__"])
  ]);
  const stCount: Record<string, number> = {};
  (storeCounts.data || []).forEach(r => { stCount[r.channel_id] = (stCount[r.channel_id] || 0) + 1; });
  const uCount: Record<string, number> = {};
  const uPaid: Record<string, number> = {};
  (userCounts.data || []).forEach(r => {
    uCount[r.channel_id] = (uCount[r.channel_id] || 0) + 1;
    uPaid[r.channel_id] = (uPaid[r.channel_id] || 0) + Number(r.paid_amount || 0);
  });
  const board = (channelList || []).map(c => ({
    id: c.id,
    name: c.name,
    region: [c.province, c.city].filter(Boolean).join(" · "),
    stores: stCount[c.id] || 0,
    users: uCount[c.id] || 0,
    paid: uPaid[c.id] || 0
  })).sort((a, b) => b.users - a.users).slice(0, 8);

  const scopeHint = scopedCh && scopedCh !== "__none__" ? "（当前代操作渠道范围）" : (session.role === "channel_admin" ? "（我的渠道范围）" : "（全平台）");

  return (
    <div>
      <PageHeader
        title="数据看板"
        description={`欢迎回来，${session.display_name} ${scopeHint}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard tone="primary" label="渠道商" value={channelsRes.count || 0} icon={Building2} hint="active" />
        <StatCard tone="info" label="店铺" value={storesRes.count || 0} icon={Store} hint="覆盖门店数" />
        <StatCard label="终端用户" value={usersRes.count || 0} icon={Users} hint="学生数" />
        <StatCard label="设备数" value={"—"} icon={Smartphone} hint="待接入" />
        <StatCard tone="warning" label="订单数" value={ordersRes.count || 0} icon={ReceiptText} hint="累计订单" />
        <StatCard tone="primary" label="累计收入" value={formatMoney(totalRevenue)} icon={TrendingUp} hint="已付订单" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> 近 30 天活跃趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" /> 渠道汇总
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChannelLeaderboard rows={board} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">题库</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{assessRes.count || 0}</div>
            <p className="mt-1 text-xs text-muted-foreground">测评题总数</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">资源</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{resRes.count || 0}</div>
            <p className="mt-1 text-xs text-muted-foreground">文本 / 视频 / 文件</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">即将上线</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>· 测评结果分析与报告</li>
              <li>· 终端 App 数据对接</li>
              <li>· 渠道返佣结算</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
