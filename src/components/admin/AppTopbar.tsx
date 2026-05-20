"use client";
import { useRouter } from "next/navigation";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, LogOut, User, Search } from "lucide-react";
import { toast } from "sonner";
import { ActingAsSwitcher } from "./ActingAsSwitcher";
import type { SessionPayload } from "@/lib/session";

const roleLabel: Record<string, { text: string; variant: any }> = {
  super_admin: { text: "超级管理员", variant: "default" },
  admin: { text: "管理员", variant: "default" },
  channel_admin: { text: "渠道商", variant: "info" }
};

export function AppTopbar({
  session,
  channels,
  actingChannelId
}: {
  session: SessionPayload;
  channels: { id: string; name: string }[];
  actingChannelId: string | null;
}) {
  const router = useRouter();

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("已安全退出");
    router.push("/login");
    router.refresh();
  }

  const initials = session.display_name?.slice(0, 1) || session.username.slice(0, 1).toUpperCase();
  const rl = roleLabel[session.role] || { text: "用户", variant: "muted" };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md lg:px-6">
      {/* 搜索框（占位） */}
      <div className="hidden md:flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50">
        <Search className="h-3.5 w-3.5" />
        <span>快速搜索…</span>
        <kbd className="ml-3 hidden md:inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground/80">⌘K</kbd>
      </div>

      <div className="flex-1" />

      {(session.role === "admin" || session.role === "super_admin") && (
        <ActingAsSwitcher channels={channels} actingChannelId={actingChannelId} />
      )}

      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-accent">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left leading-tight">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {session.display_name}
                <Badge variant={rl.variant} className="px-1.5 py-0 text-[10px]">{rl.text}</Badge>
              </div>
              <div className="text-[11px] text-muted-foreground">@{session.username}</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>账号</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => router.push("/settings/profile")}>
            <User className="h-4 w-4" /> 个人资料
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onLogout} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" /> 退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
