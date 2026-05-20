import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  tone = "default",
  className
}: {
  label: string;
  value: string | number;
  icon?: any;
  hint?: string;
  trend?: number;
  tone?: "default" | "primary" | "info" | "warning";
  className?: string;
}) {
  const toneStyles: Record<string, string> = {
    default: "from-muted/30 to-muted/10 text-foreground",
    primary: "from-primary/15 to-primary/5 text-primary",
    info: "from-info/15 to-info/5 text-info",
    warning: "from-warning/15 to-warning/5 text-warning"
  };
  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-card p-5 transition-shadow hover:shadow-md", className)}>
      <div className={cn("absolute inset-x-0 top-0 h-24 bg-gradient-to-b", toneStyles[tone])} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
          {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/70 backdrop-blur">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      {typeof trend === "number" && (
        <div className="relative mt-3 flex items-center gap-1 text-xs">
          {trend >= 0 ? (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-success/10 px-1.5 py-0.5 text-success">
              <TrendingUp className="h-3 w-3" /> +{trend.toFixed(1)}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-destructive/10 px-1.5 py-0.5 text-destructive">
              <TrendingDown className="h-3 w-3" /> {trend.toFixed(1)}%
            </span>
          )}
          <span className="text-muted-foreground">较上周</span>
        </div>
      )}
    </div>
  );
}
