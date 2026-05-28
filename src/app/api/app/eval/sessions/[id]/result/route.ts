/**
 * GET /api/app/eval/sessions/:id/result — 拿测评报告
 *
 *   header: Authorization: Bearer <token>
 *   resp:   { ok, report }  | 401 / 403 / 404 / 409 (NOT_COMPLETED)
 *
 * 报告内容跟后台 ReportView 用的 value1..value10 一致, 前端按这套字段渲染。
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { buildReportForSession } from "@/lib/report/build";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;
  const sb = adminSupabase();

  const { data: sess } = await sb.from("report_sessions")
    .select("id, code, end_user_id, status, report_data, completed_at")
    .eq("id", params.id).maybeSingle();
  if (!sess) return NextResponse.json({ ok: false, error: "记录不存在", code: "NOT_FOUND" }, { status: 404 });
  if (sess.end_user_id !== auth.payload.student_id) {
    return NextResponse.json({ ok: false, error: "无权访问此测评", code: "NOT_OWNER" }, { status: 403 });
  }
  if (sess.status !== "completed") {
    return NextResponse.json({ ok: false, error: "测评尚未完成", code: "NOT_COMPLETED" }, { status: 409 });
  }

  // 优先用已存的 report_data, 没有就实时构建
  let report = sess.report_data;
  if (!report) {
    const r = await buildReportForSession(params.id);
    if (!r?.report) return NextResponse.json({ ok: false, error: "无法构建报告", code: "BUILD_FAILED" }, { status: 500 });
    report = r.report;
    await sb.from("report_sessions").update({ report_data: report }).eq("id", params.id);
  }

  return NextResponse.json({
    ok: true,
    session: {
      id: sess.id,
      code: sess.code,
      completed_at: sess.completed_at
    },
    report
  });
}
