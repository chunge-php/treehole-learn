/**
 * 学生 App 端写心愿信件 + 自己看自己写过的列表
 *
 * GET  /api/app/wishes              — 当前学生的信件列表
 * POST /api/app/wishes { content, title?, year?, month? } — 写一封新信
 *
 *   header:  Authorization: Bearer <app_token>
 *
 * 平台端家长用 /api/mp/wishes 读, 同一张表.
 * year/month 不传默认当前年月.
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { shortId } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CONTENT_MAX = 2000;
const TITLE_MAX = 30;

export async function GET(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("student_wishes")
    .select("id, title, content, year, month, created_at")
    .eq("end_user_id", auth.payload.student_id)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    list: (data || []).map((w: any) => ({
      id: w.id,
      title: w.title,
      content: w.content,
      year: w.year,
      month: w.month,
      createdAt: w.created_at
    }))
  });
}

export async function POST(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const content = String(body?.content || "").trim().slice(0, CONTENT_MAX);
    if (!content) return NextResponse.json({ ok: false, error: "信件内容不能为空" }, { status: 400 });
    const title = String(body?.title || "孩子给您的一封信").trim().slice(0, TITLE_MAX);
    const now = new Date();
    const year = Number(body?.year) || now.getFullYear();
    const month = Number(body?.month) || now.getMonth() + 1;

    const sb = adminSupabase();
    // 拿学生 channel/store_id 写进去保持行隔离
    const { data: stu } = await sb.from("end_users").select("channel_id, store_id").eq("id", auth.payload.student_id).maybeSingle();
    const row = {
      id: shortId("wsh"),
      end_user_id: auth.payload.student_id,
      channel_id: (stu as any)?.channel_id ?? null,
      store_id:   (stu as any)?.store_id ?? null,
      title,
      content,
      year,
      month: Math.min(12, Math.max(1, month))
    };
    const { error } = await sb.from("student_wishes").insert(row);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "提交失败" }, { status: 500 });
  }
}
