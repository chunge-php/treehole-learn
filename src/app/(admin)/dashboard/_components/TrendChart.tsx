"use client";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function generateData() {
  const data: { day: string; users: number; orders: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const day = `${d.getMonth() + 1}/${d.getDate()}`;
    const base = 18 + Math.sin(i / 3) * 8 + Math.random() * 6;
    data.push({
      day,
      users: Math.max(0, Math.round(base + Math.random() * 12)),
      orders: Math.max(0, Math.round(base * 0.4 + Math.random() * 5))
    });
  }
  return data;
}

export function TrendChart() {
  const data = useMemo(generateData, []);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="leafA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(158 68% 36%)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(158 68% 36%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="leafB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(210 92% 50%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(210 92% 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Area type="monotone" dataKey="users" stroke="hsl(158 68% 36%)" strokeWidth={2} fill="url(#leafA)" name="活跃用户" />
          <Area type="monotone" dataKey="orders" stroke="hsl(210 92% 50%)" strokeWidth={2} fill="url(#leafB)" name="订单数" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
