"use client";
import { useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/upload";
import { AssetPickerDialog } from "./AssetPickerDialog";
import { toast } from "sonner";
import { Upload, Loader2, X, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 单文件上传 + URL 输入 + 素材库选择 复合控件
 * - 文本框: 手动粘贴 URL
 * - 上传按钮: 选择本地文件上传到 Supabase Storage
 * - 素材库按钮: 浏览已上传过的素材并复用
 */
export type UploadedInfo = { url: string; name: string; size: number; type: string; ext: string };

export function UploadField({
  value,
  onChange,
  onUploaded,
  accept = "image/*",
  prefix = "img",
  placeholder = "粘贴 URL / 上传 / 从素材库选择",
  preview = true,
  enablePicker = true,
  pickerKinds,
  className
}: {
  value?: string | null;
  onChange: (v: string | null) => void;
  onUploaded?: (info: UploadedInfo) => void;
  accept?: string;
  prefix?: string;
  placeholder?: string;
  preview?: boolean;
  enablePicker?: boolean;
  pickerKinds?: Array<"image" | "video" | "audio" | "file">;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);

  function onPick(file: File | null) {
    if (!file) return;
    start(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("prefix", prefix);
        const r = await uploadFile(fd);
        if (!r.ok) throw new Error(r.error || "上传失败");
        onChange(r.url || null);
        if (onUploaded && r.url) {
          const ext = (file.name.split(".").pop() || "").toLowerCase();
          onUploaded({ url: r.url, name: file.name, size: file.size, type: file.type, ext });
        }
        toast.success("已上传");
      } catch (e: any) {
        toast.error(e?.message || "上传失败");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  const isImage = accept.includes("image");
  const inferredKinds: Array<"image" | "video" | "audio" | "file"> = pickerKinds || (
    isImage ? ["image"] :
    accept.includes("video") ? ["video"] :
    ["image", "video", "audio", "file"]
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Input
          value={value || ""}
          onChange={e => onChange(e.target.value || null)}
          placeholder={placeholder}
          className="flex-1"
        />
        {enablePicker && (
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => setPickerOpen(true)}
            disabled={pending}
            className="shrink-0"
            title="从素材库选择"
          >
            <FolderOpen className="h-4 w-4" /> 素材库
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="shrink-0"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {pending ? "上传中" : "上传"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            title="清除"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => onPick(e.target.files?.[0] || null)}
      />
      {preview && value && isImage && (
        <div className="rounded-lg border bg-muted/20 p-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="max-h-32 max-w-xs rounded object-contain" onError={(e: any) => { e.target.style.display = "none"; }} />
        </div>
      )}

      {enablePicker && (
        <AssetPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={a => onChange(a.url)}
          acceptKinds={inferredKinds}
        />
      )}
    </div>
  );
}
