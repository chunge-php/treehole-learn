"use client";
import { useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/upload";
import { toast } from "sonner";
import { Image as ImageIcon, Upload, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 单文件上传 + URL 输入复合控件
 * - 文本框: 手动粘贴 URL
 * - 按钮: 选择本地文件上传到 Supabase Storage, 成功后填回文本框
 * - 已有值时显示预览缩略 (图片)
 */
export function UploadField({
  value,
  onChange,
  accept = "image/*",
  prefix = "img",
  placeholder = "粘贴 URL 或点击上传",
  preview = true,
  className
}: {
  value?: string | null;
  onChange: (v: string | null) => void;
  accept?: string;
  prefix?: string;
  placeholder?: string;
  preview?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [_progress, setProgress] = useState(0);

  function onPick(file: File | null) {
    if (!file) return;
    setProgress(0);
    start(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("prefix", prefix);
        const r = await uploadFile(fd);
        if (!r.ok) throw new Error(r.error || "上传失败");
        onChange(r.url || null);
        toast.success("已上传");
      } catch (e: any) {
        toast.error(e?.message || "上传失败");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  const isImage = accept.includes("image");

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Input
          value={value || ""}
          onChange={e => onChange(e.target.value || null)}
          placeholder={placeholder}
          className="flex-1"
        />
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
    </div>
  );
}
