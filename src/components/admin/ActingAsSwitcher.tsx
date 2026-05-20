"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, X } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Channel = { id: string; name: string };

export function ActingAsSwitcher({
  channels,
  actingChannelId
}: {
  channels: Channel[];
  actingChannelId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const active = channels.find(c => c.id === actingChannelId);
  const filtered = channels.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));

  function setActing(id: string | null) {
    start(async () => {
      const res = await fetch("/api/auth/acting", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel_id: id })
      });
      if (!res.ok) {
        toast.error("切换失败");
        return;
      }
      toast.success(id ? `已切换为「${channels.find(c => c.id === id)?.name}」身份` : "已退出代操作模式");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "group flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent",
            active && "border-primary/30 bg-accent text-accent-foreground"
          )}
        >
          <Building2 className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground")} />
          <span className="max-w-[140px] truncate">
            {active ? active.name : "全局视角"}
          </span>
          {active && (
            <Badge variant="default" className="px-1.5 py-0 text-[10px]">代操作中</Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-3">
          <div className="text-xs font-medium">以渠道商身份操作</div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            切换后，新建/导入数据将归属该渠道；列表也仅展示其下数据。
          </p>
        </div>
        <div className="p-2">
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="搜索渠道名…"
            className="h-8 text-xs"
          />
        </div>
        <div className="max-h-72 overflow-y-auto px-2 pb-2">
          <button
            onClick={() => setActing(null)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
              !actingChannelId && "bg-accent text-accent-foreground"
            )}
          >
            <span className="text-muted-foreground">全局视角（不代操作）</span>
            {!actingChannelId && <Check className="h-3.5 w-3.5 text-primary" />}
          </button>
          {filtered.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">无匹配渠道</div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setActing(c.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                  actingChannelId === c.id && "bg-accent text-accent-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {c.name}
                </span>
                {actingChannelId === c.id && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))
          )}
        </div>
        {actingChannelId && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => setActing(null)}
              disabled={pending}
            >
              <X className="h-3.5 w-3.5" /> 退出代操作
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
