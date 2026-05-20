"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { upsertResource, type ResourceInput } from "../actions";
import { TYPE_LABEL, type ResourceType } from "./constants";
import { toast } from "sonner";
import { Loader2, FileText, Video, File as FileIcon } from "lucide-react";

export function ResourceForm({
  open, onOpenChange, initial, defaultType, categories, onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  defaultType?: ResourceType;
  categories: { id: string; name: string }[];
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<ResourceInput>({
    id: initial?.id,
    type: (initial?.type as ResourceType) || defaultType || "text",
    title: initial?.title || "",
    cover_url: initial?.cover_url || "",
    body: initial?.body || "",
    media_url: initial?.media_url || "",
    duration_sec: initial?.duration_sec ?? null,
    file_size: initial?.file_size ?? null,
    file_ext: initial?.file_ext || "",
    category_id: initial?.category_id || null,
    status: initial?.status || "online",
    sort_order: initial?.sort_order ?? 0,
    remark: initial?.remark || ""
  });
  const [pending, start] = useTransition();

  function submit() {
    if (!form.title.trim()) { toast.error("请填写标题"); return; }
    if (form.type === "text" && !(form.body || "").trim()) { toast.error("请填写正文内容"); return; }
    if (form.type !== "text" && !(form.media_url || "").trim()) { toast.error("请填写媒体地址"); return; }
    start(async () => {
      try {
        await upsertResource(form);
        toast.success(initial ? "已更新" : "已创建");
        onOpenChange(false);
        onSaved?.();
      } catch (e: any) {
        toast.error(e?.message || "保存失败");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "编辑资源" : "新增资源"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>资源类型 <span className="text-destructive">*</span></Label>
            <Tabs
              value={form.type}
              onValueChange={v => setForm({ ...form, type: v as ResourceType })}
            >
              <TabsList>
                <TabsTrigger value="text" disabled={!!initial}><FileText className="h-3.5 w-3.5" /> {TYPE_LABEL.text}</TabsTrigger>
                <TabsTrigger value="video" disabled={!!initial}><Video className="h-3.5 w-3.5" /> {TYPE_LABEL.video}</TabsTrigger>
                <TabsTrigger value="file" disabled={!!initial}><FileIcon className="h-3.5 w-3.5" /> {TYPE_LABEL.file}</TabsTrigger>
              </TabsList>
            </Tabs>
            {initial && (
              <p className="text-[11px] text-muted-foreground">资源类型创建后不可更改</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>标题 <span className="text-destructive">*</span></Label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="资源标题"
              />
            </div>
            <div className="space-y-1.5">
              <Label>所属分类</Label>
              <Select value={form.category_id || "__none"} onValueChange={v => setForm({ ...form, category_id: v === "__none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="未分类" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">未分类</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>封面图 URL</Label>
            <Input
              value={form.cover_url || ""}
              onChange={e => setForm({ ...form, cover_url: e.target.value })}
              placeholder="https://… 资源封面图地址"
            />
            {form.cover_url ? (
              <img src={form.cover_url} alt="" className="mt-1 h-20 w-32 rounded border object-cover" />
            ) : null}
          </div>

          {form.type === "text" && (
            <div className="space-y-1.5">
              <Label>正文内容 <span className="text-destructive">*</span></Label>
              <Textarea
                value={form.body || ""}
                onChange={e => setForm({ ...form, body: e.target.value })}
                rows={8}
                placeholder="支持纯文本/Markdown。学生端将按段落渲染"
                className="font-mono text-sm"
              />
            </div>
          )}

          {form.type === "video" && (
            <>
              <div className="space-y-1.5">
                <Label>视频地址 <span className="text-destructive">*</span></Label>
                <Input
                  value={form.media_url || ""}
                  onChange={e => setForm({ ...form, media_url: e.target.value })}
                  placeholder="https://… mp4/m3u8 视频地址"
                />
              </div>
              <div className="space-y-1.5">
                <Label>时长（秒）</Label>
                <Input
                  type="number"
                  value={form.duration_sec ?? ""}
                  onChange={e => setForm({ ...form, duration_sec: e.target.value === "" ? null : Number(e.target.value) })}
                  placeholder="例：180 表示 3 分钟"
                />
              </div>
            </>
          )}

          {form.type === "file" && (
            <>
              <div className="space-y-1.5">
                <Label>文件下载地址 <span className="text-destructive">*</span></Label>
                <Input
                  value={form.media_url || ""}
                  onChange={e => setForm({ ...form, media_url: e.target.value })}
                  placeholder="https://… 文件下载链接"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>文件大小（字节）</Label>
                  <Input
                    type="number"
                    value={form.file_size ?? ""}
                    onChange={e => setForm({ ...form, file_size: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="例：1048576"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>扩展名</Label>
                  <Input
                    value={form.file_ext || ""}
                    onChange={e => setForm({ ...form, file_ext: e.target.value })}
                    placeholder="pdf / docx / zip"
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>排序</Label>
              <Input
                type="number"
                value={form.sort_order ?? 0}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                placeholder="数值越小越靠前"
              />
            </div>
            <div className="space-y-1.5">
              <Label>备注</Label>
              <Input
                value={form.remark || ""}
                onChange={e => setForm({ ...form, remark: e.target.value })}
                placeholder="内部备注（学生不可见）"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
            <div>
              <div className="text-sm font-medium">上架状态</div>
              <div className="text-xs text-muted-foreground">下架后学生端将不可见</div>
            </div>
            <Switch
              checked={form.status === "online"}
              onCheckedChange={c => setForm({ ...form, status: c ? "online" : "offline" })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            保 存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
