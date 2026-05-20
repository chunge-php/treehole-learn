import { getCurrentSession } from "@/lib/session";
import { adminSupabase } from "@/lib/supabase/admin";
import { scopedChannelFilter } from "@/lib/scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Store, Users, Smartphone, Activity, TrendingUp, ClipboardList } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { ChannelLeaderboard } from "./_components/ChannelLeaderboard";
import { TrendChart } from "./_components/TrendChart";

export default async function DashboardPage() {
  const session = getCurrentSession()!;
  const sb = adminSupabase();
  const scopedCh = scopedChannelFilter(session);
  const isAdmin = session.role !== "channel_admin";

  // 通用 channel_id 过滤
  const applyScope = <T extends { eq: (col: string, v: any) => T }>(qb: T) =>
    scopedCh && scopedCh !== "__none__" ? qb.eq("channel_id", scopedCh) : qb;

  // === 6 张统计卡 ===
  const [channelsRes, storesRes, usersRes, recordsRes, deviceSumRes, revenueRows] = await Promise.all([
    sb.from("channels").select("id", { count: "exact", head: true }),
    applyScope(sb.from("stores").select("id", { count: "exact", head: true })),
    applyScope(sb.from("end_users").select("id", { count: "exact", head: true })),
    applyScope(sb.from("assessment_records").select("id", { count: "exact", head: true })),
    applyScope(sb.from("stores").select("device_count")),
    applyScope(sb.from("orders").select("amount").eq("pay_status", "paid"))
  ]);
  const totalDevices = ((deviceSumRes as any).data || []).reduce((s: number, r: any) => s + Number(r.device_count || 0), 0);
  const totalRevenue = ((revenueRows as any).data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  // === 渠道汇总表 ===
  const { data: channelList = [] } = await sb.from("channels").select("id, name, province, city").limit(50);
  const channelIds = (channelList || []).map(c => c.id);
  const safeIds = channelIds.length ? channelIds : ["__none__"];
  const [storeRows, userRows, assessRows, paidRows] = await Promise.all([
    sb.from("stores").select("channel_id, device_count").in("channel_id", safeIds),
    sb.from("end_users").select("channel_id").in("channel_id", safeIds),
    sb.from("assessment_records").select("channel_id").in("channel_id", safeIds),
    sb.from("orders").select("channel_id, amount").eq("pay_status", "paid").in("channel_id", safeIds)
  ]);

  const agg: Record<string, { stores: number; devices: number; users: number; records: number; revenue: number }> = {};
  const bump = (id: string, k: keyof typeof agg[string], v = 1) => {
    if (!agg[id]) agg[id] = { stores: 0, devices: 0, users: 0, records: 0, revenue: 0 };
    (agg[id][k] as number) += v;
  };
  (storeRows.data || []).forEach((r: any) => { bump(r.channel_id, "stores"); bump(r.channel_id, "devices", Number(r.device_count || 0)); });
  (userRows.data || []).forEach((r: any) => bump(r.channel_id, "users"));
  (assessRows.data || []).forEach((r: any) => bump(r.channel_id, "records"));
  (paidRows.data || []).forEach((r: any) => bump(r.channel_id, "revenue", Number(r.amount || 0)));

  const board = (channelList || []).map(c => ({
    id: c.id,
    name: c.name,
    region: [c.province, c.city].filter(Boolean).join(" · "),
    stores: agg[c.id]?.stores || 0,
    devices: agg[c.id]?.devices || 0,
    users: agg[c.id]?.users || 0,
    records: agg[c.id]?.records || 0,
    revenue: agg[c.id]?.revenue || 0
  })).sort((a, b) => b.users - a.users);

  const scopeHint = scopedCh && scopedCh !== "__none__" ? "（当前代操作渠道范围）" : (session.role === "channel_admin" ? "（我的渠道范围）" : "（全平台）");

  return (
    <div>
      <PageHeader
        title="数据看板"
        description={`欢迎回来，${session.display_name} ${scopeHint}`}
      />

      {/* 6 张统计卡: 总用户数 / 销售金额 / 店铺 / 测评人次 / 设备数 / 渠道商 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard tone="primary" label="总用户数" value={usersRes.count || 0} icon={Users} hint="终端学员" href="/end-users" />
        <StatCard tone="primary" label="销售金额" value={formatMoney(totalRevenue)} icon={TrendingUp} hint="已付订单累计" href="/orders" />
        <StatCard tone="info" label="店铺" value={storesRes.count || 0} icon={Store} hint="覆盖门店数" href="/stores" />
        <StatCard tone="warning" label="测评人次" value={recordsRes.count || 0} icon={ClipboardList} hint="累计完成数" />
        <StatCard label="设备数" value={totalDevices} icon={Smartphone} hint="店铺设备合计" />
        <StatCard label="渠道商" value={channelsRes.count || 0} icon={Building2} hint="active" href={isAdmin ? "/channels" : undefined} />
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
              <Building2 className="h-4 w-4 text-primary" /> 即将上线
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>· 测评结果分析与个性化报告</li>
              <li>· 终端 App 数据对接 (OpenAPI)</li>
              <li>· 渠道返佣结算</li>
              <li>· 设备心跳与状态监控</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 渠道汇总表 */}
      {isAdmin && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" /> 渠道汇总
              <span className="text-xs font-normal text-muted-foreground">店铺数 / 用户数 / 销售金额 可点击下钻</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChannelLeaderboard rows={board} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
