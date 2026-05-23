"use client";
import { BulkImportDialog } from "@/components/admin/BulkImportDialog";
import { bulkImportEndUsers } from "../actions";

export function ImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone?: () => void }) {
  return (
    <BulkImportDialog
      open={open}
      onOpenChange={onOpenChange}
      onDone={onDone}
      title="批量导入用户"
      description="先下载模板，按列名填写后上传。「所属店铺名称」「所属渠道商名称」均可留空（留空则不关联渠道商）。同时填写「登录账号 + 登录密码」可一键开通小程序/平板端登录。"
      templateFields={[
        { key: "name", label: "姓名", example: "张三" },
        { key: "store_name", label: "所属店铺名称", example: "海淀中关村学习中心（可留空）" },
        { key: "channel_name", label: "所属渠道商名称", example: "（可留空，不填店铺时按此归属渠道商）" },
        { key: "phone", label: "关联手机号", example: "13800138000" },
        { key: "login_username", label: "登录账号", example: "zhangsan001" },
        { key: "login_password", label: "登录密码", example: "abc123" },
        { key: "remark", label: "备注", example: "" }
      ]}
      templateFilename="用户导入模板.xlsx"
      errorsFilename="用户导入错误"
      importFn={bulkImportEndUsers}
    />
  );
}
