"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveAgreement, type AgreementRow } from "../actions";

type T = "user" | "privacy";
const LABELS: Record<T, string> = { user: "用户服务协议", privacy: "隐私政策" };

function emptyRow(type: T): AgreementRow {
  return { id: "", type, title: LABELS[type], content: "", version: "1.0", updated_at: "" };
}

export function Client({ initialRows }: { initialRows: AgreementRow[] }) {
  const init: Record<T, AgreementRow> = {
    user: initialRows.find(r => r.type === "user") || emptyRow("user"),
    privacy: initialRows.find(r => r.type === "privacy") || emptyRow("privacy")
  };
  const [rows, setRows] = useState(init);
  const [pending, start] = useTransition();

  function update(type: T, patch: Partial<AgreementRow>) {
    setRows(prev => ({ ...prev, [type]: { ...prev[type], ...patch } }));
  }

  function onSave(type: T) {
    const r = rows[type];
    start(async () => {
      try {
        await saveAgreement({ type, title: r.title, content: r.content, version: r.version });
        toast.success(`${LABELS[type]}已保存`);
      } catch (e: any) {
        toast.error(e?.message || "保存失败");
      }
    });
  }

  return (
    <Tabs defaultValue="user" className="w-full">
      <TabsList>
        <TabsTrigger value="user">用户服务协议</TabsTrigger>
        <TabsTrigger value="privacy">隐私政策</TabsTrigger>
      </TabsList>

      {(["user", "privacy"] as T[]).map(type => {
        const r = rows[type];
        return (
          <TabsContent key={type} value={type}>
            <Card className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <div className="space-y-1.5">
                  <Label>标题</Label>
                  <Input value={r.title} onChange={e => update(type, { title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>版本号</Label>
                  <Input value={r.version} onChange={e => update(type, { version: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>正文（支持 Markdown）</Label>
                <Textarea
                  value={r.content}
                  onChange={e => update(type, { content: e.target.value })}
                  rows={20}
                  className="font-mono text-xs leading-relaxed"
                  placeholder="在此填写协议正文…"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {r.updated_at ? `上次更新：${new Date(r.updated_at).toLocaleString("zh-CN")}` : "尚未保存"}
                </span>
                <Button onClick={() => onSave(type)} disabled={pending}>
                  {pending ? "保存中…" : "保存"}
                </Button>
              </div>
            </Card>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
