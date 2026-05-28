/**
 * 学生 App 端: 心愿条目 (零散小心愿, 月底由信件工作流打包生成家长信)
 *
 * GET  /api/app/wish-items[?year=&month=]  — 我的心愿条目, 默认按 created_at 倒序最近 50 条
 *                                              传 year+month 只取该月
 * POST /api/app/wish-items { content }     — 加一条新心愿 (限 300 字)
 * DELETE /api/app/wish-items?id=xxx        — 删自己的条目
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { shortId } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CONTENT_MAX = 300;

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString();
  const end   = new Date(year, month,     1, 0, 0, 0, 0).toISOString();
  return { start, end };
}

export async function GET(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const year  = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));

  const sb = adminSupabase();
  let q = sb.from("student_wish_items")
    .select("id, content, created_at")
    .eq("end_user_id", auth.payload.student_id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (year && month) {
    const r = monthRange(year, month);
    q = q.gte("created_at", r.start).lt("created_at", r.end);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    list: (data || []).map((w: any) => ({ id: w.id, content: w.content, createdAt: w.created_at }))
  });
}

export async function POST(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const content = String(body?.content || "").trim().slice(0, CONTENT_MAX);
    if (!content) return NextResponse.json({ ok: false, error: "心愿内容不能为空" }, { status: 400 });

    const sb = adminSupabase();
    const { data: stu } = await sb.from("end_users")
      .select("channel_id, store_id").eq("id", auth.payload.student_id).maybeSingle();
    const row = {
      id: shortId("wi"),
      end_user_id: auth.payload.student_id,
      channel_id: (stu as any)?.channel_id ?? null,
      store_id:   (stu as any)?.store_id ?? null,
      content
    };
    const { error } = await sb.from("student_wish_items").insert(row);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "提交失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "缺少 id" }, { status: 400 });
  const sb = adminSupabase();
  const { error } = await sb.from("student_wish_items")
    .delete()
    .eq("id", id)
    .eq("end_user_id", auth.payload.student_id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
