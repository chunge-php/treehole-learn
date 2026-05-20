"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { readExcelFile, templateDownload, downloadExcel } from "@/lib/excel";
import { toast } from "sonner";
import {
  Download, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, X, RotateCcw, Upload
} from "lucide-react";
import { cn } from "@/lib/utils";

type Stage = "idle" | "parsing" | "ready" | "importing" | "done";
type ImportResult = { total: number; success: number; failed: number; errors: { row: number; message: string }[] };

export function BulkImportDialog({
  open,
  onOpenChange,
  onDone,
  title,
  description,
  templateFields,
  templateFilename,
  errorsFilename,
  importFn
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone?: () => void;
  title: string;
  description?: string;
  templateFields: { key: string; label: string; example?: any }[];
  templateFilename: string;
  errorsFilename: string;
  importFn: (rows: Record<string, any>[]) => Promise<ImportResult>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setFile(null); setRows([]); setResult(null); setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  }
  useEffect(() => { if (!open) reset(); }, [open]);

  function download() {
    templateDownload(templateFields, templateFilename);
  }

  async function onPickFile(f: File | null) {
    if (!f) { reset(); return; }
    setFile(f); setStage("parsing"); setResult(null);
    try {
      const parsed = await readExcelFile(f);
      setRows(parsed);
      setStage("ready");
    } catch (e: any) {
      toast.error(e?.message || "解析失败");
      reset();
    }
  }

  function upload() {
    if (rows.length === 0) { toast.error("文件没有有效行"); return; }
    setStage("importing");
    start(async () => {
      try {
        const r = await importFn(rows);
        setResult(r);
        setStage("done");
        if (r.failed === 0) toast.success(`成功导入 ${r.success} 条`);
        else toast.warning(`成功 ${r.success} / 失败 ${r.failed}`);
        onDone?.();
      } catch (e: any) {
        toast.error(e?.message || "导入失败");
        setStage("ready");
      }
    });
  }

  function exportErrors() {
    if (!result?.errors.length) return;
    downloadExcel(
      result.errors.map(e => ({ 行号: e.row, 错误信息: e.message })),
      `${errorsFilename}_${Date.now()}.xlsx`
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription className="whitespace-pre-line">
              {description}
              <br />文件在浏览器本地解析，不会被上传到服务器；点击「开始导入」后才会写入数据库。
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" onClick={download} className="w-full">
            <Download className="h-4 w-4" /> 下载导入模板
          </Button>

          {(stage === "idle" || stage === "parsing") && (
            <label className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-muted/20 p-8 transition-colors",
              stage === "parsing" ? "border-primary/40 bg-accent/40" : "border-border hover:border-primary/40 hover:bg-accent/40"
            )}>
              {stage === "parsing" ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">
                {stage === "parsing" ? `正在解析 ${file?.name}…` : "点击选择 Excel 文件"}
              </span>
              <span className="text-xs text-muted-foreground">支持 .xlsx / .xls / .csv</span>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => onPickFile(e.target.files?.[0] || null)}
                disabled={stage === "parsing"}
              />
            </label>
          )}

          {stage === "ready" && file && (
            <div className="rounded-xl border bg-card p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {(file.size / 1024).toFixed(1)} KB · 检测到 <span className="font-medium text-foreground">{rows.length}</span> 行数据
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={reset} title="重新选择">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {rows.length > 0 && (
                <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-md px-2.5 py-1.5 font-mono truncate">
                  样本: {Object.keys(rows[0]).slice(0, 4).join(" · ")}…
                </div>
              )}
            </div>
          )}

          {stage === "importing" && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Upload className="h-5 w-5 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">正在导入</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    服务端处理 {rows.length} 条数据中…
                  </div>
                </div>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary via-info to-primary"
                  style={{ animation: "th-shimmer 1.5s ease-in-out infinite" }}
                />
              </div>
              <style>{`@keyframes th-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
            </div>
          )}

          {stage === "done" && result && (
            <div className={cn(
              "rounded-xl border p-4 space-y-3",
              result.failed === 0 ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    result.failed === 0 ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                  )}>
                    {result.failed === 0 ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {result.failed === 0 ? "全部导入成功" : "部分导入失败"}
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      共 {result.total} 条 · 成功 <span className="text-success font-medium">{result.success}</span>
                      {result.failed > 0 && <> · 失败 <span className="text-destructive font-medium">{result.failed}</span></>}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={reset}>
                  <RotateCcw className="h-3.5 w-3.5" /> 再导一批
                </Button>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">错误明细（前 50 条）</span>
                    <button
                      onClick={exportErrors}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Download className="h-3 w-3" /> 全部下载
                    </button>
                  </div>
                  <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border bg-background p-2 text-[11px] text-muted-foreground">
                    {result.errors.slice(0, 50).map((e, i) => (
                      <li key={i} className="font-mono">
                        <span className="text-foreground/70">第 {e.row} 行</span>：{e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>关闭</Button>
          <Button
            onClick={upload}
            disabled={stage !== "ready" || pending}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            开始导入{stage === "ready" && rows.length > 0 ? ` (${rows.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
