"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { readExcelFile, templateDownload } from "@/lib/excel";
import { bulkImportAssessments } from "../actions";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

export function ImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ total: number; success: number; failed: number; errors: any[] } | null>(null);

  function download() {
    templateDownload(
      [
        { key: "title", label: "题目", example: "你通常如何安排自己的学习计划？" },
        { key: "dimension", label: "维度", example: "学习态度" },
        { key: "qtype", label: "题型", example: "单选" },
        { key: "options", label: "选项", example: '[{"label":"非常清晰","value":"A","score":4},{"label":"较为清晰","value":"B","score":3},{"label":"模糊不清","value":"C","score":2},{"label":"从未规划","value":"D","score":1}]' },
        { key: "answer", label: "答案", example: "A" },
        { key: "explanation", label: "解析", example: "" },
        { key: "score", label: "分值", example: 4 },
        { key: "sort_order", label: "排序", example: 0 },
        { key: "project_id", label: "项目ID", example: "" }
      ],
      "测评题库导入模板.xlsx"
    );
  }

  function upload() {
    if (!file) { toast.error("请选择文件"); return; }
    start(async () => {
      try {
        const rows = await readExcelFile(file);
        const r = await bulkImportAssessments(rows);
        setResult(r);
        if (r.failed === 0) toast.success(`成功导入 ${r.success} 条`);
        else toast.warning(`成功 ${r.success} / 失败 ${r.failed}`);
        onDone?.();
      } catch (e: any) {
        toast.error(e?.message || "导入失败");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) { setFile(null); setResult(null); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>批量导入测评题</DialogTitle>
          <DialogDescription>
            维度填中文（学习态度/学习方法/学习能力/学习习惯），题型填中文（单选/多选/简答）。
            选项支持 JSON 数组或用「|」分隔；多选答案用「,」分隔。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" onClick={download} className="w-full">
            <Download className="h-4 w-4" /> 下载导入模板
          </Button>

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 transition-colors hover:border-primary/40 hover:bg-accent/40">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">{file ? file.name : "点击选择 Excel 文件"}</span>
            <span className="text-xs text-muted-foreground">支持 .xlsx / .xls / .csv</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </label>

          {result && (
            <div className="rounded-lg border bg-card p-3 text-xs">
              <div>共 <b>{result.total}</b> 条 · 成功 <span className="text-success">{result.success}</span> · 失败 <span className="text-destructive">{result.failed}</span></div>
              {result.errors.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-muted-foreground">
                  {result.errors.slice(0, 50).map((e, i) => <li key={i}>第 {e.row} 行：{e.message}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
          <Button onClick={upload} disabled={!file || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            开始导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
