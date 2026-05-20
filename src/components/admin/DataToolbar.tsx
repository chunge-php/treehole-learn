"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Upload, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function DataToolbar({
  q,
  onSearch,
  onCreate,
  onImport,
  onExport,
  createLabel = "新增",
  placeholder = "搜索…",
  rightExtra,
  className
}: {
  q: string;
  onSearch: (v: string) => void;
  onCreate?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  createLabel?: string;
  placeholder?: string;
  rightExtra?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={e => onSearch(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-64 pl-8"
        />
      </div>
      <div className="flex items-center gap-2">
        {rightExtra}
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-3.5 w-3.5" /> 导出
          </Button>
        )}
        {onImport && (
          <Button variant="outline" size="sm" onClick={onImport}>
            <Upload className="h-3.5 w-3.5" /> 导入
          </Button>
        )}
        {onCreate && (
          <Button size="sm" onClick={onCreate}>
            <Plus className="h-3.5 w-3.5" /> {createLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
