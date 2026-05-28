"use client";
import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { UploadField } from "@/components/admin/UploadField";
import { upsertResource, type ResourceInput } from "../actions";
import { TYPE_LABEL, type ResourceType, formatFileSize } from "./constants";
import { toast } from "sonner";
import { Loader2, FileText, Video, File as FileIcon, FolderTree, ArrowUpRight } from "lucide-react";
import Link from "next/link";

type CategoryOpt = { id: string; name: string; parent_id?: string | null; parent_name?: string | null };

export function ResourceForm({
  open, onOpenChange, initial, defaultType, categories, onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  defaultType?: ResourceType;
  categories: CategoryOpt[];
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

  // 一级 / 二级分类拆分 + 当前选中的一级 (用于级联)
  const topLevels = categories.filter(c => !c.parent_id);
  const subLevels = categories.filter(c => c.parent_id);
  // 当前选中的二级反推一级
  const initialParentId = (() => {
    if (!initial?.category_id) return null;
    const found = subLevels.find(c => c.id === initial.category_id);
    return found?.parent_id || null;
  })();
  const [parentId, setParentId] = useState<string | null>(initialParentId);
  const subsInParent = parentId ? subLevels.filter(c => c.parent_id === parentId) : [];

  useEffect(() => {
    if (!open) return;
    setForm({
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
    // 反推一级 (从初始二级 category_id 取 parent_id)
    if (initial?.category_id) {
      const found = subLevels.find(c => c.id === initial.category_id);
      setParentId(found?.parent_id || null);
    } else {
      setParentId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, open, defaultType]);

  const isFile = form.type === "file";

  function submit() {
    // 文件类型: 标题可空, 后端会用 name 兜底; 其他类型必填
    if (!isFile && !form.title.trim()) { toast.error("请填写标题"); return; }
    if (form.type === "text" && !(form.body || "").trim()) { toast.error("请填写正文内容"); return; }
    if (form.type !== "text" && !(form.media_url || "").trim()) { toast.error("请上传或填写文件地址"); return; }
    start(async () => {
      try {
        // 文件类型: 标题为空时用文件名兜底 (file_ext 也兜底)
        const payload = { ...form };
        if (isFile && !payload.title.trim()) {
          const fname = (form.media_url || "").split("/").pop() || "未命名文件";
          payload.title = fname.replace(/\.[^.]+$/, "");
        }
        await upsertResource(payload);
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

          {/* 文件类型: 先上传, 再(可选)填标题 */}
          {isFile && (
            <>
              <div className="space-y-1.5">
                <Label>上传文件 <span className="text-destructive">*</span></Label>
                <UploadField
                  value={form.media_url}
                  onChange={v => setForm({ ...form, media_url: v })}
                  onUploaded={info => {
                    setForm(f => ({
                      ...f,
                      media_url: info.url,
                      file_size: info.size,
                      file_ext: info.ext,
                      // 标题留空时自动填充 (用户没手动填过)
                      title: f.title.trim() ? f.title : info.name.replace(/\.[^.]+$/, "")
                    }));
                  }}
                  accept="*"
                  prefix="resource-file"
                  placeholder="粘贴 URL / 上传文件 / 从素材库选择"
                  preview={false}
                  pickerKinds={["file", "image", "video", "audio"]}
                />
                {form.media_url && form.file_size != null && (
                  <p className="text-[11px] text-muted-foreground">
                    {form.file_ext ? <code className="font-mono mr-1.5">.{form.file_ext}</code> : null}
                    {formatFileSize(form.file_size)}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>标题 <span className="text-[11px] text-muted-foreground">（选填，留空时自动用文件名）</span></Label>
                <Input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="自动从文件名填充"
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
            </>
          )}

          {/* 文本 / 视频: 完整字段 */}
          {!isFile && (
            <>
              <div className="space-y-1.5">
                <Label>标题 <span className="text-destructive">*</span></Label>
                <Input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="资源标题"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <FolderTree className="h-3.5 w-3.5 text-muted-foreground" /> 所属分类
                  </Label>
                  <Link
                    href="/settings/top-types"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    管理顶级类型 <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Combobox
                    options={topLevels.map(c => ({ value: c.id, label: c.name }))}
                    value={parentId}
                    onChange={v => {
                      setParentId(v || null);
                      // 切一级时清空二级 (避免悬挂选择)
                      setForm(f => ({ ...f, category_id: null }));
                    }}
                    placeholder="选一级分类"
                    searchPlaceholder="搜索…"
                    emptyText={topLevels.length === 0 ? "尚未配置一级分类" : "无匹配"}
                    clearable
                  />
                  <Combobox
                    key={`sub-${parentId || "none"}`}
                    options={subsInParent.map(c => ({ value: c.id, label: c.name }))}
                    value={form.category_id || null}
                    onChange={v => setForm({ ...form, category_id: v })}
                    placeholder={parentId ? "选二级分类" : "请先选一级"}
                    searchPlaceholder="搜索…"
                    emptyText={!parentId ? "请先选一级" : (subsInParent.length === 0 ? "该一级下暂无二级" : "无匹配")}
                    clearable
                  />
                </div>
                {categories.length === 0 && (
                  <p className="text-[11px] text-warning">
                    尚未配置任何分类, 请先到「设置 → 顶级类型」中创建
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>封面图</Label>
                <UploadField
                  value={form.cover_url}
                  onChange={v => setForm({ ...form, cover_url: v })}
                  accept="image/*"
                  prefix="cover"
                  placeholder="URL / 上传 / 素材库"
                />
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
                    <UploadField
                      value={form.media_url}
                      onChange={v => setForm({ ...form, media_url: v })}
                      onUploaded={info => setForm(f => ({ ...f, media_url: info.url }))}
                      accept="video/*"
                      prefix="resource-video"
                      placeholder="URL / 上传视频 / 素材库"
                      preview={false}
                      pickerKinds={["video"]}
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
            </>
          )}
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
