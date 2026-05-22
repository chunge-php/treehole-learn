"use client";
import { useState, useEffect } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 带友好降级的图片: 加载失败时显示「加载失败」占位, 而不是浏览器默认裂图
 * - showTip=false 时只显示图标 (用于很小的缩略图)
 */
export function SafeImage({
  src,
  alt = "",
  className,
  fallbackClassName,
  showTip = true
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  showTip?: boolean;
}) {
  const [err, setErr] = useState(false);
  // src 变化时重置错误态 (复用同一节点切换图片)
  useEffect(() => { setErr(false); }, [src]);

  if (!src || err) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 bg-muted/40 text-muted-foreground",
          className,
          fallbackClassName
        )}
        title="图片加载失败"
      >
        <ImageOff className="h-4 w-4" />
        {showTip && <span className="text-[10px] leading-none">加载失败</span>}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setErr(true)} />
  );
}
