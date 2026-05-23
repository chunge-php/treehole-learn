"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Store, Users, ClipboardList, BookOpen,
  Settings2, ReceiptText, Leaf, ShieldCheck, ChevronRight, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: any; adminOnly?: boolean; badge?: string };
type Group = { title: string; items: Item[] };

const groups: Group[] = [
  {
    title: "概览",
    items: [{ href: "/dashboard", label: "数据看板", icon: LayoutDashboard }]
  },
  {
    title: "数据链",
    items: [
      { href: "/channels", label: "渠道商", icon: Building2, adminOnly: true },
      { href: "/stores", label: "店铺", icon: Store },
      { href: "/end-users", label: "用户管理", icon: Users }
    ]
  },
  {
    title: "内容",
    items: [
      { href: "/assessments", label: "测评题库", icon: ClipboardList, adminOnly: true },
      { href: "/resources", label: "资源库", icon: BookOpen, adminOnly: true }
    ]
  },
  {
    title: "经营",
    items: [{ href: "/orders", label: "订单", icon: ReceiptText }]
  },
  {
    title: "管理",
    items: [
      { href: "/settings/channel-levels", label: "渠道级别", icon: ShieldCheck, adminOnly: true },
      { href: "/settings/top-types", label: "顶级类型", icon: Settings2, adminOnly: true },
      { href: "/settings/agreements", label: "协议管理", icon: FileText, adminOnly: true },
      { href: "/settings/accounts", label: "账号管理", icon: Users, adminOnly: true }
    ]
  }
];

export function AppSidebar({ role }: { role: "super_admin" | "admin" | "channel_admin" }) {
  const pathname = usePathname();
  const isAdmin = role !== "channel_admin";

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r bg-card/40">
      <div className="flex h-14 items-center gap-2 px-5 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Leaf className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">树洞 TreeHole</div>
          <div className="text-[10px] text-muted-foreground">Learning Assessment</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map(g => {
          const items = g.items.filter(i => !i.adminOnly || isAdmin);
          if (items.length === 0) return null;
          return (
            <div key={g.title} className="mb-6">
              <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {g.title}
              </div>
              <div className="space-y-0.5">
                {items.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "bg-primary text-primary-foreground font-medium shadow-sm shadow-primary/20"
                          : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <item.icon className={cn("h-4 w-4", active ? "opacity-100" : "opacity-70 group-hover:opacity-100")} />
                        {item.label}
                      </span>
                      {active && <ChevronRight className="h-3.5 w-3.5 opacity-80" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t p-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          系统运行中
        </div>
        <div className="mt-1 opacity-70">v0.1.0 · 树洞绿</div>
      </div>
    </aside>
  );
}
