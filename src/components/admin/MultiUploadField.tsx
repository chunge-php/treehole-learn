"use client";
import { useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/upload";
import { toast } from "sonner";
import { Upload, Loader2, X, Image as ImageIcon, Video as VideoIcon, FileIcon, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export type MediaItem = { url: string; type: string; name?: string };

/**
 * 多文件上传 - 支持图片 / 视频; 数组形式存储
 * 不支持拖拽排序 (现阶段)
 */
export function MultiUploadField({
  value,
  onChange,
  accept = "image/*,video/*",
  prefix = "media",
  className
}: {
  value: MediaItem[];
  onChange: (v: MediaItem[]) => void;
  accept?: string;
  prefix?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    start(async () => {
      const next: MediaItem[] = [...value];
      for (const file of list) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("prefix", prefix);
          const r = await uploadFile(fd);
          if (!r.ok) {
            toast.error(`${file.name}: ${r.error || "上传失败"}`);
            continue;
          }
          next.push({
            url: r.url!,
            type: r.type || file.type || "",
            name: r.name || file.name
          });
        } catch (e: any) {
          toast.error(`${file.name}: ${e?.message || "上传失败"}`);
        }
      }
      onChange(next);
      if (inputRef.current) inputRef.current.value = "";
      toast.success(`已上传 ${next.length - value.length} / ${list.length} 个文件`);
    });
  }

  function remove(idx: number) {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  }

  function iconOf(type: string) {
    if (type.startsWith("image/")) return ImageIcon;
    if (type.startsWith("video/")) return VideoIcon;
    return FileIcon;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          已上传 <b className="text-foreground tabular-nums">{value.length}</b> 个文件
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {pending ? "上传中" : "添加文件"}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={e => onPickFiles(e.target.files)}
      />
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((m, i) => {
            const Icon = iconOf(m.type);
            const isImage = m.type.startsWith("image/");
            const isVideo = m.type.startsWith("video/");
            return (
              <div key={i} className="group relative rounded-lg border bg-card overflow-hidden">
                <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
                  ) : isVideo ? (
                    <video src={m.url} className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="px-2 py-1 text-[10px] truncate text-muted-foreground" title={m.name}>
                  <Icon className="h-3 w-3 inline mr-1" />
                  {m.name || m.url.split("/").pop()}
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
