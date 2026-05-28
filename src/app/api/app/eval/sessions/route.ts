/**
 * GET /api/app/eval/sessions — 当前学生的所有测评记录(列表)
 *
 *   header: Authorization: Bearer <token>
 *   query:  ?status=completed|in_progress|all (默认 all), ?limit=20
 *   resp:   { ok, sessions: [{...}] }
 *
 * 用于 App 个人中心「学习力报告」入口的历史列表展示。
 * 详情/PDF/分享 — 不走这套, 直接用公开页 /report/<session_id> WebView 嵌入。
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") || "all";
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1), 100);

  const sb = adminSupabase();
  let qb = sb
    .from("report_sessions")
    .select("id, code, status, total_questions, answered_count, completed_at, created_at, report_data")
    .eq("end_user_id", auth.payload.student_id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (statusFilter === "completed") qb = qb.eq("status", "completed");
  if (statusFilter === "in_progress") qb = qb.eq("status", "in_progress");

  const { data, error } = await qb;
  if (error) return NextResponse.json({ ok: false, error: error.message, code: "DB_ERROR" }, { status: 500 });

  const sessions = (data || []).map((r: any) => ({
    id: r.id,
    code: r.code,
    status: r.status,
    total_questions: r.total_questions,
    answered_count: r.answered_count,
    progress_pct: r.total_questions ? Math.round((r.answered_count / r.total_questions) * 100) : 0,
    completed_at: r.completed_at,
    created_at: r.created_at,
    has_report: !!r.report_data,
    // 公开报告页 path (WebView 直接拼 baseUrl + path)
    public_report_path: r.status === "completed" ? `/report/${r.id}` : null
  }));

  return NextResponse.json({ ok: true, sessions });
}
