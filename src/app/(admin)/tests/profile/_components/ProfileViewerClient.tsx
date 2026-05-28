"use client";
import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, User, Phone, GraduationCap, Building2, BarChart3, ListChecks, FileBarChart, Sparkles, History, FileJson, Eye, RefreshCw } from "lucide-react";
import { getStudentDossier, resetStudentProfile, type StudentOpt, type StudentDossier } from "../actions";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { toast } from "sonner";

export function ProfileViewerClient({ students, initialId }: { students: StudentOpt[]; initialId: string }) {
  const [studentId, setStudentId] = useState(initialId);
  const [dossier, setDossier] = useState<StudentDossier | null>(null);
  const [loading, startLoad] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, startReset] = useTransition();

  function refreshDossier() {
    if (!studentId) return;
    startLoad(async () => {
      try { setDossier(await getStudentDossier(studentId)); }
      catch (e: any) { toast.error(e?.message || "加载失败"); }
    });
  }

  function doReset() {
    if (!studentId) return;
    startReset(async () => {
      try {
        const r = await resetStudentProfile(studentId);
        if (r.ok) {
          toast.success(r.message + (r.rebuilt_from_report ? ` (来源 ${r.rebuilt_from_report})` : ""));
          setResetOpen(false);
          refreshDossier();
        } else {
          toast.error(r.message);
        }
      } catch (e: any) { toast.error(e?.message || "重置失败"); }
    });
  }

  useEffect(() => {
    if (!studentId) { setDossier(null); return; }
    refreshDossier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-1.5 max-w-md">
          <Label>选择学生</Label>
          <Combobox
            options={students.map(u => ({
              value: u.id, label: u.name,
              hint: [u.grade, u.store || u.channel, u.phone].filter(Boolean).join(" · ")
            }))}
            value={studentId}
            onChange={setStudentId}
            placeholder="按姓名/手机搜索"
            searchPlaceholder="搜索…"
          />
        </div>
      </Card>

      {loading && (
        <Card className="p-12 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 inline animate-spin" /> 加载档案…
        </Card>
      )}

      {!loading && !dossier && (
        <Card className="p-12 text-center text-muted-foreground">
          选择学生后展示综合档案
        </Card>
      )}

      {!loading && dossier && (
        <>
          {/* 基础卡 */}
          <Card className="p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-2xl font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {dossier.student.name}
                  {dossier.student.gender && (
                    <Badge variant="outline" className="text-xs">{dossier.student.gender === "male" ? "男" : dossier.student.gender === "female" ? "女" : "其他"}</Badge>
                  )}
                  {dossier.student.age && <Badge variant="outline" className="text-xs">{dossier.student.age} 岁</Badge>}
                </div>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <Info icon={GraduationCap} label="年级" value={dossier.student.grade || "—"} />
                  <Info icon={Building2} label="渠道/店铺" value={[dossier.student.channels?.name, dossier.student.stores?.name].filter(Boolean).join(" / ") || "—"} />
                  <Info icon={Phone} label="电话" value={dossier.student.phone || "—"} />
                  <Info icon={User} label="家长" value={[dossier.student.parent_name, dossier.student.parent_phone].filter(Boolean).join(" / ") || "—"} />
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {dossier.profile?.updated_at && (
                  <div className="text-xs text-muted-foreground">
                    档案更新: {new Date(dossier.profile.updated_at).toLocaleString("zh-CN", { hour12: false })}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => setResetOpen(true)} disabled={resetting}>
                  {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  重置档案
                </Button>
              </div>
            </div>
          </Card>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview"><BarChart3 className="h-4 w-4" /> 总览</TabsTrigger>
              <TabsTrigger value="reports"><FileBarChart className="h-4 w-4" /> 测评报告历史</TabsTrigger>
              <TabsTrigger value="multimodal"><ListChecks className="h-4 w-4" /> 多模态详情</TabsTrigger>
              <TabsTrigger value="ai"><Sparkles className="h-4 w-4" /> AI 档案分片</TabsTrigger>
              <TabsTrigger value="log"><History className="h-4 w-4" /> 更新流水</TabsTrigger>
              <TabsTrigger value="raw"><FileJson className="h-4 w-4" /> 原始 JSON</TabsTrigger>
            </TabsList>

            {/* 总览 */}
            <TabsContent value="overview" className="pt-3 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <SectionCard title="最近多模态" empty={!dossier.profile?.multimodal_latest}>
                  {dossier.profile?.multimodal_latest && (
                    <MultimodalSummary mm={dossier.profile.multimodal_latest} />
                  )}
                </SectionCard>
                <SectionCard title="最近测评报告" empty={!dossier.profile?.report_latest}>
                  {dossier.profile?.report_latest && (
                    <div className="text-sm space-y-2">
                      <div className="text-xs text-muted-foreground">会话: {dossier.profile.report_latest.session_id}</div>
                      <div className="text-xs text-muted-foreground">
                        生成于: {new Date(dossier.profile.report_latest.evaluated_at).toLocaleString("zh-CN", { hour12: false })}
                      </div>
                      <pre className="text-xs whitespace-pre-wrap font-sans bg-muted/40 rounded p-2">
                        {JSON.stringify(dossier.profile.report_latest.summary, null, 2)}
                      </pre>
                    </div>
                  )}
                </SectionCard>
              </div>
            </TabsContent>

            {/* 测评报告历史 */}
            <TabsContent value="reports" className="pt-3">
              <Card className="overflow-hidden">
                {dossier.reports.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">还没有测评记录</div>
                ) : (
                  <div className="divide-y">
                    {dossier.reports.map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{r.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {r.code && <span className="font-mono mr-2">{r.code}</span>}
                            {new Date(r.created_at).toLocaleString("zh-CN", { hour12: false })}
                          </div>
                        </div>
                        <div className="text-xs tabular-nums text-muted-foreground">
                          {r.answered_count}/{r.total_questions}
                        </div>
                        <Badge variant={r.status === "completed" ? "success" : "warning"}>
                          {r.status === "completed" ? "已完成" : "作答中"}
                        </Badge>
                        {r.has_report && (
                          <Link href={`/tests/reports/${r.id}/result`}>
                            <Button variant="outline" size="sm"><Eye className="h-3.5 w-3.5" /> 查看</Button>
                          </Link>
                        )}
                        <Link href={`/tests/reports/${r.id}`}>
                          <Button variant="ghost" size="sm">详情</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* 多模态详情 */}
            <TabsContent value="multimodal" className="pt-3">
              {!dossier.profile?.multimodal_latest ? (
                <Card className="p-12 text-center text-sm text-muted-foreground">
                  暂无多模态记录 · <Link href={`/tests/multimodal`} className="text-primary underline">去做一次模拟</Link>
                </Card>
              ) : (
                <Card className="p-4 space-y-3">
                  <MultimodalSummary mm={dossier.profile.multimodal_latest} />
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-2">11 项明细</div>
                    <ScoreBars scores={dossier.profile.multimodal_latest.scores} />
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">外部 JSON</summary>
                    <pre className="mt-2 rounded bg-muted/40 p-2 overflow-auto max-h-80">{JSON.stringify(dossier.profile.multimodal_latest.external_json, null, 2)}</pre>
                  </details>
                </Card>
              )}
            </TabsContent>

            {/* AI 档案分片 */}
            <TabsContent value="ai" className="pt-3">
              <div className="grid gap-3 md:grid-cols-2">
                <SectionCard title="基础档案 (basic)" empty={isEmpty(dossier.profile?.basic)}>
                  <JsonBlock data={dossier.profile?.basic} />
                </SectionCard>
                <SectionCard title="知识点 (knowledge)" empty={isEmpty(dossier.profile?.knowledge)}>
                  <JsonBlock data={dossier.profile?.knowledge} />
                </SectionCard>
                <SectionCard title="课程与刷题 (courses)" empty={isEmpty(dossier.profile?.courses)}>
                  <JsonBlock data={dossier.profile?.courses} />
                </SectionCard>
                <SectionCard title="今日学习状态 (today_state)" empty={isEmpty(dossier.profile?.today_state)}>
                  <JsonBlock data={dossier.profile?.today_state} />
                </SectionCard>
                <SectionCard title="心理状态 (psychology)" empty={isEmpty(dossier.profile?.psychology)}>
                  <JsonBlock data={dossier.profile?.psychology} />
                </SectionCard>
                <SectionCard title="AI 互动 (ai_history)" empty={isEmpty(dossier.profile?.ai_history)}>
                  <JsonBlock data={dossier.profile?.ai_history} />
                </SectionCard>
              </div>
            </TabsContent>

            {/* 更新流水 */}
            <TabsContent value="log" className="pt-3">
              <Card className="overflow-hidden">
                {!Array.isArray(dossier.profile?.source_log) || dossier.profile.source_log.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">暂无更新流水</div>
                ) : (
                  <div className="divide-y">
                    {dossier.profile.source_log.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 text-sm">
                        <Badge variant="outline" className="w-20 justify-center">{labelOfSource(s.source)}</Badge>
                        <div className="flex-1 text-xs text-muted-foreground">{new Date(s.at).toLocaleString("zh-CN", { hour12: false })}</div>
                        {s.by && <div className="text-xs text-muted-foreground">by {s.by.slice(0, 10)}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* 原始 JSON */}
            <TabsContent value="raw" className="pt-3">
              <Card className="p-3">
                <pre className="text-xs overflow-auto max-h-[600px]">{JSON.stringify(dossier.profile, null, 2) || "（尚无 user_profiles 记录）"}</pre>
              </Card>
            </TabsContent>
          </Tabs>

          <ConfirmDialog
            open={resetOpen}
            onOpenChange={v => !v && !resetting && setResetOpen(false)}
            title="重置学生档案"
            description={`确定清空「${dossier.student.name}」的档案并从最近一次测评报告自动重建? 多模态最近结果会丢失, 需重新做一次多模态测试。AI 对话历史 (ai_history.recent_chats) 也会清空。`}
            destructive
            loading={resetting}
            confirmText="重置"
            onConfirm={doReset}
          />
        </>
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className="text-muted-foreground">{label}</div>
        <div className="font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

function SectionCard({ title, children, empty }: { title: string; children: any; empty?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-sm font-medium mb-2">{title}</div>
      {empty ? <div className="text-xs text-muted-foreground py-4 text-center">—</div> : children}
    </Card>
  );
}

function isEmpty(o: any) { return !o || (typeof o === "object" && Object.keys(o).length === 0); }

function JsonBlock({ data }: { data: any }) {
  return <pre className="text-xs whitespace-pre-wrap font-sans bg-muted/40 rounded p-2 max-h-60 overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
}

function MultimodalSummary({ mm }: { mm: any }) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-4">
        <div>
          <div className="text-xs text-muted-foreground">综合分</div>
          <div className="text-3xl font-bold tabular-nums">{mm.composite}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">等级</div>
          <div className="text-2xl font-semibold tabular-nums text-primary">{mm.level}</div>
        </div>
        <Badge variant="default">{mm.state_label}</Badge>
      </div>
      {mm.dimensions && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <DimBar name="专注力" v={mm.dimensions.concentration} />
          <DimBar name="抗压力" v={mm.dimensions.stress} />
          <DimBar name="学习状态" v={mm.dimensions.status} />
        </div>
      )}
      {mm.comment && <div className="text-sm">{mm.comment}</div>}
      {mm.evaluated_at && (
        <div className="text-xs text-muted-foreground">
          {new Date(mm.evaluated_at).toLocaleString("zh-CN", { hour12: false })}
        </div>
      )}
    </div>
  );
}

function DimBar({ name, v }: { name: string; v: number }) {
  return (
    <div>
      <div className="flex justify-between"><span className="text-muted-foreground">{name}</span><span className="tabular-nums">{v}</span></div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
        <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function ScoreBars({ scores }: { scores: Record<string, number> }) {
  const entries = Object.entries(scores || {});
  return (
    <div className="grid gap-1.5 md:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2 text-xs">
          <div className="flex-1 truncate font-mono text-[10px] text-muted-foreground">{k}</div>
          <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
          </div>
          <div className="w-8 text-right tabular-nums">{v}</div>
        </div>
      ))}
    </div>
  );
}

function labelOfSource(s: string) {
  if (s === "multimodal") return "多模态";
  if (s === "report") return "测评报告";
  return s || "—";
}
