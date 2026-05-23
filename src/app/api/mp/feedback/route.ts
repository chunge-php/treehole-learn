import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getMpAuth } from "@/lib/mp-session";
import { shortId } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CONTENT_MAX = 500;

/** 我的反馈记录 */
export async function GET(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  try {
    const sb = adminSupabase();
    const { data, error } = await sb
      .from("mp_feedback")
      .select("id, content, contact, status, reply, created_at")
      .eq("parent_id", auth.parent_id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const list = (data || []).map((f: any) => ({
      id: f.id,
      content: f.content,
      contact: f.contact,
      status: f.status,
      statusText: f.status === "resolved" ? "已处理" : "待处理",
      reply: f.reply,
      createdAt: f.created_at
    }));
    return NextResponse.json({ ok: true, list });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "读取失败" }, { status: 500 });
  }
}

/** 提交反馈 */
export async function POST(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const content = String(body?.content || "").trim().slice(0, CONTENT_MAX);
    const contact = String(body?.contact || "").trim().slice(0, 50) || null;
    if (!content) return NextResponse.json({ ok: false, error: "请填写反馈内容" }, { status: 400 });

    const sb = adminSupabase();
    const { error } = await sb.from("mp_feedback").insert({
      id: shortId("fb"),
      parent_id: auth.parent_id,
      content,
      contact
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "提交失败" }, { status: 500 });
  }
}
