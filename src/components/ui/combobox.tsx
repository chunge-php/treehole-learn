"use client";
import * as React from "react";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/utils";

export type ComboboxOption = { value: string; label: string; hint?: string };

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "请选择",
  searchPlaceholder = "搜索...",
  emptyText = "无匹配",
  className,
  triggerClassName,
  popoverWidth = "trigger",
  disabled,
  clearable,
  align = "start"
}: {
  options: ComboboxOption[];
  value?: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  popoverWidth?: "trigger" | "auto";
  disabled?: boolean;
  clearable?: boolean;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find(o => o.value === value);
  const popoverCls = popoverWidth === "trigger" ? "w-[var(--radix-popover-trigger-width)]" : "min-w-[14rem]";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background transition-colors hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate text-left flex-1">{selected?.label || placeholder}</span>
          <span className="flex items-center gap-1 shrink-0">
            {clearable && selected && !disabled && (
              <span
                role="button"
                onPointerDown={e => { e.preventDefault(); e.stopPropagation(); onChange(null); }}
                className="inline-flex h-4 w-4 items-center justify-center rounded-sm hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", popoverCls, className)} align={align}>
        <Command className="bg-transparent" loop>
          <div className="flex items-center border-b px-3">
            <Search className="h-3.5 w-3.5 text-muted-foreground mr-2 shrink-0" />
            <Command.Input
              placeholder={searchPlaceholder}
              className="flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-72 overflow-auto p-1">
            <Command.Empty className="py-6 text-center text-xs text-muted-foreground">{emptyText}</Command.Empty>
            {options.map(o => (
              <Command.Item
                key={o.value}
                // cmdk 默认按 value 过滤, 我们用 label 作为 value 才能搜中文; 真实值通过闭包传
                value={`${o.label} ${o.hint || ""} ${o.value}`}
                onSelect={() => { onChange(o.value); setOpen(false); }}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
                  "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                  value === o.value && "bg-accent/50"
                )}
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0", value === o.value ? "opacity-100 text-primary" : "opacity-0")} />
                <span className="truncate flex-1">{o.label}</span>
                {o.hint && <span className="text-[11px] text-muted-foreground">{o.hint}</span>}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
