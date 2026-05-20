"use client";
import { BulkImportDialog } from "@/components/admin/BulkImportDialog";
import { bulkImportAssessments } from "../actions";

export function ImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone?: () => void }) {
  return (
    <BulkImportDialog
      open={open}
      onOpenChange={onOpenChange}
      onDone={onDone}
      title="批量导入测评题库"
      description="维度填中文 (学习态度/学习方法/学习能力/学习习惯), 题型填 (单选/多选/简答), 选项为 JSON 数组。"
      templateFields={[
        { key: "title", label: "题目", example: "你通常如何安排自己的学习计划？" },
        { key: "dimension", label: "维度", example: "学习态度" },
        { key: "qtype", label: "题型", example: "单选" },
        { key: "options", label: "选项", example: '[{"label":"非常清晰","value":"A","score":4},{"label":"较为清晰","value":"B","score":3},{"label":"模糊不清","value":"C","score":2},{"label":"从未规划","value":"D","score":1}]' },
        { key: "answer", label: "答案", example: "A" },
        { key: "explanation", label: "解析", example: "" },
        { key: "score", label: "分值", example: 4 },
        { key: "sort_order", label: "排序", example: 0 },
        { key: "project_id", label: "项目ID", example: "" }
      ]}
      templateFilename="测评题库导入模板.xlsx"
      errorsFilename="测评题库导入错误"
      importFn={bulkImportAssessments}
    />
  );
}
