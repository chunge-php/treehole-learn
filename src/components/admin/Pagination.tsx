"use client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page, pageSize, total, onChange
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between border-t bg-card/40 px-4 py-3 text-xs text-muted-foreground">
      <div>
        共 <span className="font-medium tabular-nums text-foreground">{total}</span> 条
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="tabular-nums">
          第 <span className="font-medium text-foreground">{page}</span> / {totalPages} 页
        </div>
        <Button variant="ghost" size="icon" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
