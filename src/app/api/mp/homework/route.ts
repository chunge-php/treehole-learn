import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getMpAuth } from "@/lib/mp-session";
import { resolveChild } from "@/lib/mp-bindings";
import { shortId } from "@/lib/utils";

export const dynamic = "force-dynamic";

const NAME_MAX = 30;

function sourceText(s: string) {
  return s === "parent" ? "家长添加" : "后台添加";
}

/**
 * 作业列表 (当前孩子)
 * GET /api/mp/homework[?endUserId=]
 * 出参: { ok, student:{id,name}|null, list:[{id,title,from,done,startDate,endDate}] }
 */
export async function GET(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const child = await resolveChild(auth.parent_id, url.searchParams.get("endUserId"));
    if (!child) return NextResponse.json({ ok: true, student: null, list: [] });

    const sb = adminSupabase();
    const { data, error } = await sb
      .from("assignments")
      .select("id, name, start_date, end_date, completed_at, source")
      .eq("end_user_id", child.id)
      .order("start_date", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const list = (data || []).map((a: any) => ({
      id: a.id,
      title: a.name,
      from: sourceText(a.source),
      source: a.source,
      done: !!a.completed_at,
      startDate: a.start_date,
      endDate: a.end_date
    }));
    return NextResponse.json({ ok: true, student: { id: child.id, name: child.name }, list });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "读取失败" }, { status: 500 });
  }
}

/**
 * 家长端添加作业 (一次可多条)
 * POST { items:[名称], startDate, endDate, endUserId? }  source 固定 parent
 */
export async function POST(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const child = await resolveChild(auth.parent_id, body?.endUserId);
    if (!child) return NextResponse.json({ ok: false, error: "请先在「我的-用户绑定」绑定孩子" }, { status: 400 });

    const raw: any[] = Array.isArray(body?.items) ? body.items : body?.name ? [body.name] : [];
    const names = raw
      .map((x) => String(x || "").trim().slice(0, NAME_MAX))
      .filter(Boolean);
    if (names.length === 0) return NextResponse.json({ ok: false, error: "请填写作业内容" }, { status: 400 });

    const today = new Date().toISOString().slice(0, 10);
    const startDate = String(body?.startDate || today).slice(0, 10);
    const endDate = String(body?.endDate || startDate).slice(0, 10);

    const rows = names.map((name) => ({
      id: shortId("at"),
      end_user_id: child.id,
      channel_id: child.channel_id,
      store_id: child.store_id,
      name,
      start_date: startDate,
      end_date: endDate,
      source: "parent"
    }));
    const sb = adminSupabase();
    const { error } = await sb.from("assignments").insert(rows);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "添加失败" }, { status: 500 });
  }
}
