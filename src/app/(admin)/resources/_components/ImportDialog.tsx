"use client";
import { BulkImportDialog } from "@/components/admin/BulkImportDialog";
import { bulkImportResources } from "../actions";

export function ImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone?: () => void }) {
  return (
    <BulkImportDialog
      open={open}
      onOpenChange={onOpenChange}
      onDone={onDone}
      title="批量导入资源库"
      description="类型填中文 (文本/视频/文件)。文本类型必填正文; 视频/文件类型必填媒体地址。"
      templateFields={[
        { key: "title", label: "标题", example: "如何制定有效的学习计划" },
        { key: "type", label: "类型", example: "文本" },
        { key: "cover_url", label: "封面", example: "" },
        { key: "body", label: "正文", example: "（仅文本类型必填）" },
        { key: "media_url", label: "媒体地址", example: "（视频/文件必填）" },
        { key: "duration_sec", label: "时长秒", example: 180 },
        { key: "file_size", label: "文件大小", example: 1048576 },
        { key: "file_ext", label: "扩展名", example: "pdf" },
        { key: "category_id", label: "分类ID", example: "" },
        { key: "sort_order", label: "排序", example: 0 },
        { key: "remark", label: "备注", example: "" }
      ]}
      templateFilename="资源库导入模板.xlsx"
      errorsFilename="资源库导入错误"
      importFn={bulkImportResources}
    />
  );
}
