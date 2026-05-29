"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { Plus, Pencil, Trash2, Loader2, Sparkles, Tag, Hash } from "lucide-react";
import { upsertPromptTemplate, deletePromptTemplate, type PromptTemplateRow } from "../actions";
import { toast } from "sonner";

const EMPTY: PromptTemplateRow = {
  id: "", code: "", name: "", description: "", kind: "chat", system_role: "", prefix_template: "", rules: "",
  is_active: true, version: 0, updated_at: ""
};

const KIND_OPTS: { value: "chat" | "extract" | "letter"; label: string; hint: string }[] = [
  { value: "chat",    label: "主对话",  hint: "聊天页可选, 跟学生正常对话" },
  { value: "extract", label: "抽取",    hint: "档案/心愿分析, 输出 JSON, 聊天页禁选" },
  { value: "letter",  label: "信件",    hint: "月度家长信, 聊天页禁选" }
];
const KIND_BADGE: Record<string, { label: string; variant: any }> = {
  chat:    { label: "主对话", variant: "default" },
  extract: { label: "抽取",   variant: "secondary" },
  letter:  { label: "信件",   variant: "outline" }
};

export function PromptTemplatesClient({ initialRows }: { initialRows: PromptTemplateRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PromptTemplateRow>(EMPTY);
  const [delTarget, setDelTarget] = useState<PromptTemplateRow | null>(null);
  const [saving, startSave] = useTransition();
  const [deleting, startDel] = useTransition();

  function openCreate() { setEditing({ ...EMPTY }); setEditOpen(true); }
  function openEdit(r: PromptTemplateRow) { setEditing({ ...r }); setEditOpen(true); }

  function save() {
    startSave(async () => {
      try {
        await upsertPromptTemplate(editing.id ? editing : { ...editing, id: undefined });
        toast.success(editing.id ? "已更新" : "已创建");
        setEditOpen(false);
        // 简单 reload
        location.reload();
      } catch (e: any) { toast.error(e?.message || "保存失败"); }
    });
  }

  function remove() {
    if (!delTarget) return;
    startDel(async () => {
      try {
        await deletePromptTemplate(delTarget.id);
        toast.success("已删除");
        setRows(rs => rs.filter(r => r.id !== delTarget.id));
        setDelTarget(null);
      } catch (e: any) { toast.error(e?.message || "删除失败"); }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> 新建模板</Button>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={Sparkles} title="还没有提示词模板" description="点击右上角「新建模板」创建" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>code</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>版本</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    {r.description && <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>}
                  </TableCell>
                  <TableCell><code className="text-xs">{r.code}</code></TableCell>
                  <TableCell>
                    <Badge variant={(KIND_BADGE[r.kind] || KIND_BADGE.chat).variant}>{(KIND_BADGE[r.kind] || KIND_BADGE.chat).label}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.is_active ? <Badge variant="success">启用</Badge> : <Badge variant="secondary">禁用</Badge>}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">v{r.version}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.updated_at).toLocaleString("zh-CN", { hour12: false })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" /> 编辑
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDelTarget(r)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "编辑模板" : "新建模板"}</DialogTitle>
            <DialogDescription>占位符 <code>{"{{xxx}}"}</code> 在调用时由学生档案数据填充</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> code</Label>
                <Input value={editing.code} onChange={e => setEditing(p => ({ ...p, code: e.target.value }))}
                  placeholder="multimodal_ai_tutor" disabled={!!editing.id} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> 名称</Label>
                <Input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>类型</Label>
              <div className="flex gap-2">
                {KIND_OPTS.map(o => (
                  <button key={o.value} type="button" onClick={() => setEditing(p => ({ ...p, kind: o.value }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-left transition ${editing.kind === o.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"}`}>
                    <div className="text-sm font-medium">{o.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{o.hint}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>描述</Label>
              <Input value={editing.description || ""} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>系统角色 (system role)</Label>
              <Textarea rows={5} value={editing.system_role} onChange={e => setEditing(p => ({ ...p, system_role: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>前置全局模板 (prefix, 含占位符)</Label>
              <Textarea rows={14} className="font-mono text-xs" value={editing.prefix_template}
                onChange={e => setEditing(p => ({ ...p, prefix_template: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>答题强制规则 (rules)</Label>
              <Textarea rows={8} value={editing.rules} onChange={e => setEditing(p => ({ ...p, rules: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">启用</div>
                <div className="text-xs text-muted-foreground">禁用后该模板不会被调用</div>
              </div>
              <Switch checked={editing.is_active} onCheckedChange={v => setEditing(p => ({ ...p, is_active: v }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t sticky bottom-0 bg-background py-3">
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} 保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={v => !v && setDelTarget(null)}
        title="删除模板"
        description={delTarget ? `确定删除「${delTarget.name}」?` : ""}
        destructive
        loading={deleting}
        confirmText="删除"
        onConfirm={remove}
      />
    </div>
  );
}
