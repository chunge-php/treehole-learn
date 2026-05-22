"use client";
import { BulkImportDialog } from "@/components/admin/BulkImportDialog";
import { bulkImportChannels } from "../actions";

export function ImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone?: () => void }) {
  return (
    <BulkImportDialog
      open={open}
      onOpenChange={onOpenChange}
      onDone={onDone}
      title="批量导入渠道商"
      description="先下载模板，按列名填写后上传。可同时填写「登录账号」与「登录密码」一键创建渠道管理员账号。"
      templateFields={[
        { key: "name", label: "渠道名称", example: "北京启明渠道商" },
        { key: "level_name", label: "渠道级别", example: "市级" },
        { key: "province", label: "省", example: "北京市" },
        { key: "city", label: "市", example: "北京市" },
        { key: "district", label: "区", example: "海淀区" },
        { key: "address", label: "详细地址", example: "中关村大街1号" },
        { key: "contact_name", label: "联系人", example: "李明" },
        { key: "contact_phone", label: "联系电话", example: "13800138000" },
        { key: "admin_username", label: "登录账号", example: "qiming001" },
        { key: "admin_password", label: "登录密码", example: "abc123" },
        { key: "remark", label: "备注", example: "" }
      ]}
      templateFilename="渠道商导入模板.xlsx"
      errorsFilename="渠道导入错误"
      importFn={bulkImportChannels}
    />
  );
}
