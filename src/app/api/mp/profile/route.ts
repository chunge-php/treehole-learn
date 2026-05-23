import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getMpAuth } from "@/lib/mp-session";

export const dynamic = "force-dynamic";

function shape(p: any) {
  return { id: p.id, nickname: p.nickname, avatar: p.avatar_url, phone: p.phone, hasPhone: !!p.phone };
}

/** 读当前家长资料 */
export async function GET(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("mp_parents")
    .select("id, nickname, avatar_url, phone")
    .eq("id", auth.parent_id)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "账号不存在" }, { status: 404 });
  return NextResponse.json({ ok: true, parent: shape(data) });
}

/** 改昵称 / 头像 URL */
export async function POST(req: Request) {
  try {
    const auth = getMpAuth(req);
    if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const patch: Record<string, string> = {};
    if (typeof body?.nickname === "string") patch.nickname = body.nickname.trim().slice(0, 30);
    if (typeof body?.avatar === "string") patch.avatar_url = body.avatar;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "无更新内容" }, { status: 400 });
    }
    const sb = adminSupabase();
    const { data, error } = await sb
      .from("mp_parents")
      .update(patch)
      .eq("id", auth.parent_id)
      .select("id, nickname, avatar_url, phone")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, parent: shape(data) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "保存失败" }, { status: 500 });
  }
}
