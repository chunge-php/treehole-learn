"use client";
import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listAssets } from "@/lib/upload";
import { Search, Image as ImageIcon, Video as VideoIcon, FileIcon, Loader2 } from "lucide-react";
import { formatDateCN } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Kind = "all" | "image" | "video" | "audio" | "file";
type Asset = { id: string; url: string; name: string | null; mime_type: string | null; size: number | null; kind: string; created_at: string };

export function AssetPickerDialog({
  open,
  onOpenChange,
  onSelect,
  acceptKinds = ["image", "video", "audio", "file"]
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (asset: Asset) => void;
  acceptKinds?: Array<"image" | "video" | "audio" | "file">;
}) {
  const [kind, setKind] = useState<Kind>(acceptKinds[0] || "all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Asset[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setKind(acceptKinds.length === 1 ? acceptKinds[0] : "all");
    setQ("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    start(async () => {
      const r = await listAssets({
        kind: kind === "all" ? undefined : kind,
        q: q || undefined,
        limit: 120
      });
      setRows(r);
    });
  }, [open, kind, q]);

  function iconOf(k: string) {
    if (k === "image") return ImageIcon;
    if (k === "video") return VideoIcon;
    return FileIcon;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>从素材库选择</DialogTitle>
          <DialogDescription>
            浏览本平台已上传的所有素材, 点击即选用; 新上传的文件会自动出现在这里
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          {acceptKinds.length > 1 && (
            <Tabs value={kind} onValueChange={v => setKind(v as Kind)}>
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                {acceptKinds.includes("image") && <TabsTrigger value="image"><ImageIcon className="h-3 w-3" /> 图片</TabsTrigger>}
                {acceptKinds.includes("video") && <TabsTrigger value="video"><VideoIcon className="h-3 w-3" /> 视频</TabsTrigger>}
                {acceptKinds.includes("file") && <TabsTrigger value="file"><FileIcon className="h-3 w-3" /> 文件</TabsTrigger>}
              </TabsList>
            </Tabs>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="搜索文件名…"
              className="h-9 pl-8"
            />
          </div>
          {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {pending ? "加载中…" : "素材库暂无内容; 请先在表单中上传文件"}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {rows.map(r => {
                const Icon = iconOf(r.kind);
                const isImage = r.kind === "image";
                const isVideo = r.kind === "video";
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { onSelect(r); onOpenChange(false); }}
                    className={cn(
                      "group rounded-lg border bg-card overflow-hidden text-left transition-all",
                      "hover:border-primary hover:shadow-md hover:-translate-y-0.5"
                    )}
                  >
                    <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.url} alt={r.name || ""} className="h-full w-full object-cover" loading="lazy" />
                      ) : isVideo ? (
                        <video src={r.url} className="h-full w-full object-cover" />
                      ) : (
                        <Icon className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="px-2 py-1.5 text-[11px] space-y-0.5">
                      <div className="truncate font-medium" title={r.name || undefined}>
                        <Icon className="h-3 w-3 inline mr-1 text-muted-foreground" />
                        {r.name || r.url.split("/").pop()}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{formatDateCN(r.created_at)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
