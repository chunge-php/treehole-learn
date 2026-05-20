"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { readExcelFile, templateDownload } from "@/lib/excel";
import { bulkImportEndUsers } from "../actions";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

export function ImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ total: number; success: number; failed: number; errors: any[] } | null>(null);

  function download() {
    templateDownload(
      [
        { key: "name", label: "姓名", example: "张三" },
        { key: "store_name", label: "所属店铺名称", example: "海淀中关村学习中心" },
        { key: "phone", label: "电话", example: "13800138000" },
        { key: "gender", label: "性别", example: "男" },
        { key: "age", label: "年龄", example: 11 },
        { key: "grade", label: "年级", example: "五年级" },
        { key: "school", label: "学校", example: "中关村三小" },
        { key: "parent_name", label: "家长姓名", example: "张父" },
        { key: "parent_phone", label: "家长电话", example: "13900139000" },
        { key: "paid_amount", label: "付费金额", example: 199 },
        { key: "remark", label: "备注", example: "" }
      ],
      "普通用户导入模板.xlsx"
    );
  }

  function upload() {
    if (!file) { toast.error("请选择文件"); return; }
    start(async () => {
      try {
        const rows = await readExcelFile(file);
        const r = await bulkImportEndUsers(rows);
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
          <DialogTitle>批量导入普通用户</DialogTitle>
          <DialogDescription>
            先下载模板，按列名填写后上传。系统将按「店铺名称」自动反查 store_id 与 channel_id，
            渠道管理员仅可导入自己渠道下的店铺。
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
