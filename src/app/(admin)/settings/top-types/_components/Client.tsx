"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  Settings2, ChevronRight, ChevronDown, Plus, Pencil, Trash2, ImageIcon, Search
} from "lucide-react";
import { Form } from "./Form";
import { deleteTopType, listTopTypesTree, listTopLevelOptions, type TopTypeNode } from "../actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function Client({
  initialTree, initialParents
}: {
  initialTree: TopTypeNode[];
  initialParents: { id: string; name: string }[];
}) {
  const [tree, setTree] = useState<TopTypeNode[]>(initialTree);
  const [parents, setParents] = useState(initialParents);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TopTypeNode | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<TopTypeNode | null>(null);
  const [, start] = useTransition();

  function reload() {
    start(async () => {
      const [t, p] = await Promise.all([listTopTypesTree(), listTopLevelOptions()]);
      setTree(t);
      setParents(p);
    });
  }

  function toggle(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  }

  function expandAll() {
    setExpanded(new Set(tree.map(n => n.id)));
  }
  function collapseAll() {
    setExpanded(new Set());
  }

  function onCreateRoot() {
    setEditing(null);
    setDefaultParentId(null);
    setFormOpen(true);
  }
  function onCreateChild(parentId: string) {
    setEditing(null);
    setDefaultParentId(parentId);
    setFormOpen(true);
    if (!expanded.has(parentId)) {
      const next = new Set(expanded);
      next.add(parentId);
      setExpanded(next);
    }
  }
  function onEdit(node: TopTypeNode) {
    setEditing(node);
    setDefaultParentId(node.parent_id);
    setFormOpen(true);
  }

  async function onDelete() {
    if (!delTarget) return;
    try {
      await deleteTopType(delTarget.id);
      toast.success("已删除");
      setDelTarget(null);
      reload();
    } catch (e: any) {
      toast.error(e?.message || "删除失败");
    }
  }

  const kw = q.trim().toLowerCase();
  const filtered = kw
    ? tree
        .map(root => {
          const matchRoot = root.name.toLowerCase().includes(kw);
          const matchedKids = root.children.filter(c => c.name.toLowerCase().includes(kw));
          if (matchRoot) return root;
          if (matchedKids.length > 0) return { ...root, children: matchedKids };
          return null;
        })
        .filter(Boolean) as TopTypeNode[]
    : tree;

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="搜索类型名称…"
              className="h-9 w-64 pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>展开全部</Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>收起全部</Button>
            <Button size="sm" onClick={onCreateRoot}>
              <Plus className="h-3.5 w-3.5" /> 新增一级类型
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Settings2}
            title="还没有顶级类型"
            description="点击右上角「新增一级类型」开始"
          />
        ) : (
          <div className="rounded-xl border">
            {filtered.map((node, idx) => {
              const isOpen = expanded.has(node.id);
              return (
                <div key={node.id} className={cn(idx > 0 && "border-t")}>
                  {/* 一级行 */}
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40">
                    <button
                      onClick={() => toggle(node.id)}
                      className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                    >
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <Cover url={node.cover_url} size={9} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{node.name}</span>
                        <Badge variant="outline">一级</Badge>
                        <StatusBadge status={node.status} />
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        排序 {node.sort_order ?? 0} · 子类型 {node.children.length}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onCreateChild(node.id)}>
                        <Plus className="h-3.5 w-3.5" /> 子类型
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(node)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDelTarget(node)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* 二级行 */}
                  {isOpen && node.children.length > 0 && (
                    <div className="border-t bg-muted/20">
                      {node.children.map(child => (
                        <div
                          key={child.id}
                          className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5 pl-14 last:border-b-0 hover:bg-accent/40"
                        >
                          <div className="flex gap-1">
                            <IconThumb url={child.unselected_icon_url} alt="未选中" />
                            <IconThumb url={child.selected_icon_url} alt="选中" highlight />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{child.name}</span>
                              <StatusBadge status={child.status} />
                            </div>
                            <div className="text-[11px] text-muted-foreground">排序 {child.sort_order ?? 0}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => onEdit(child)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDelTarget(child)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {isOpen && node.children.length === 0 && (
                    <div className="border-t bg-muted/10 px-4 py-3 pl-14 text-xs text-muted-foreground">
                      暂无子类型，点击右上角「子类型」新增
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Form
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        defaultParentId={defaultParentId}
        parents={parents}
        onSaved={() => reload()}
      />
      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={v => !v && setDelTarget(null)}
        title="删除类型"
        description={`确定要删除「${delTarget?.name}」吗？${delTarget?.parent_id ? "" : "如果该一级类型下有子类型，需要先删除子类型。"}`}
        confirmText="确认删除"
        destructive
        onConfirm={onDelete}
      />
    </Card>
  );
}

function Cover({ url, size = 8 }: { url: string | null; size?: number }) {
  const className = `flex h-${size} w-${size} shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40`;
  if (!url) {
    return (
      <div className={className}>
        <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
      </div>
    );
  }
  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

function IconThumb({ url, alt, highlight }: { url: string | null; alt: string; highlight?: boolean }) {
  return (
    <div
      title={alt}
      className={cn(
        "flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border bg-card",
        highlight && "ring-2 ring-primary/40"
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-contain" />
      ) : (
        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
      )}
    </div>
  );
}
