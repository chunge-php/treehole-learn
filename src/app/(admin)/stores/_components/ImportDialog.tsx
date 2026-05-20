"use client";
import { BulkImportDialog } from "@/components/admin/BulkImportDialog";
import { bulkImportStores } from "../actions";

export function ImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone?: () => void }) {
  return (
    <BulkImportDialog
      open={open}
      onOpenChange={onOpenChange}
      onDone={onDone}
      title="批量导入店铺"
      description="先下载模板，按列名填写后上传。渠道管理员导入时所属渠道自动锁定为本渠道（忽略表中渠道列）。"
      templateFields={[
        { key: "name", label: "店铺名称", example: "海淀中关村学习中心" },
        { key: "channel_name", label: "所属渠道名称", example: "北京启明渠道商" },
        { key: "province", label: "省", example: "北京市" },
        { key: "city", label: "市", example: "北京市" },
        { key: "district", label: "区", example: "海淀区" },
        { key: "address", label: "地址", example: "中关村大街1号" },
        { key: "contact_name", label: "联系人", example: "李明" },
        { key: "contact_phone", label: "电话", example: "13800138000" },
        { key: "device_count", label: "设备数", example: 3 },
        { key: "remark", label: "备注", example: "" }
      ]}
      templateFilename="店铺导入模板.xlsx"
      errorsFilename="店铺导入错误"
      importFn={bulkImportStores}
    />
  );
}
