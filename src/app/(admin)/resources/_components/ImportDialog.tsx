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
      description={
        "类型填中文 (文本/视频/文件)\n" +
        "文本类型: 必填 正文, 可填 分类名称/封面/排序/状态/备注\n" +
        "视频类型: 必填 媒体地址, 可填 分类名称/封面/时长秒/排序/状态/备注\n" +
        "文件类型: 必填 媒体地址 (标题留空时用文件名兜底), 文件大小/扩展名 可自动留空\n" +
        "分类名称需为「设置 → 顶级类型」中的二级名称, 按名匹配\n" +
        "状态填 上架 / 下架, 留空默认上架"
      }
      templateFields={[
        { key: "title", label: "标题", example: "如何制定有效的学习计划" },
        { key: "type", label: "类型", example: "文本" },
        { key: "category_name", label: "分类名称", example: "学习态度" },
        { key: "cover_url", label: "封面", example: "" },
        { key: "body", label: "正文", example: "（仅文本类型必填）" },
        { key: "media_url", label: "媒体地址", example: "（视频/文件必填）" },
        { key: "duration_sec", label: "时长秒", example: 180 },
        { key: "file_size", label: "文件大小", example: 1048576 },
        { key: "file_ext", label: "扩展名", example: "pdf" },
        { key: "sort_order", label: "排序", example: 0 },
        { key: "status", label: "状态", example: "上架" },
        { key: "remark", label: "备注", example: "" }
      ]}
      templateFilename="资源库导入模板.xlsx"
      errorsFilename="资源库导入错误"
      importFn={bulkImportResources}
    />
  );
}
