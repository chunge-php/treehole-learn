import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status?: string | null }) {
  if (status === "active" || status === "online")
    return <Badge variant="success">正常</Badge>;
  if (status === "disabled" || status === "offline")
    return <Badge variant="muted">已停用</Badge>;
  if (status === "pending")
    return <Badge variant="warning">待处理</Badge>;
  return <Badge variant="muted">{status || "—"}</Badge>;
}
