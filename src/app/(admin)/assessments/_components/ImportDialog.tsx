"use client";
import { BulkImportDialog } from "@/components/admin/BulkImportDialog";
import { bulkImportAssessments } from "../actions";

export function ImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone?: () => void }) {
  return (
    <BulkImportDialog
      open={open}
      onOpenChange={onOpenChange}
      onDone={onDone}
      title="批量导入测评题"
      description={
        "所属维度填中文 (多元性向量表/自陈量表/兴趣量表/多模态)\n" +
        "题型填中文 (单选题/判断题/语音题); 语音题无需选项与答案\n" +
        "题目内容可用 JSON 数组 [{\"label\":\"选项\",\"value\":\"A\"}] 或竖线分隔 选项1|选项2\n" +
        "答案填选项的 value (单选填 A/B/C, 判断填 T 或 F), 量表题可留空\n" +
        "序号留空时自动分配 (按当前最大值 +1)"
      }
      templateFields={[
        { key: "title", label: "题目标题", example: "遇到难题时, 你通常会..." },
        { key: "description", label: "描述", example: "" },
        { key: "cover_url", label: "封面", example: "" },
        { key: "dimension", label: "所属维度", example: "自陈量表" },
        { key: "qtype", label: "题型", example: "单选题" },
        { key: "options", label: "题目内容", example: '[{"label":"反复思考","value":"A"},{"label":"换题再说","value":"B"}]' },
        { key: "answer", label: "答案", example: "A" },
        { key: "project_name", label: "所属项目", example: "学习态度初探" },
        { key: "sort_order", label: "序号", example: "" }
      ]}
      templateFilename="测评题库导入模板.xlsx"
      errorsFilename="测评题库导入错误"
      importFn={bulkImportAssessments}
    />
  );
}
