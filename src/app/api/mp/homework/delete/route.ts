import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getMpAuth } from "@/lib/mp-session";

export const dynamic = "force-dynamic";

/**
 * 删除作业 (仅能删自己绑定孩子的、且家长端添加的作业)
 * POST { id }
 */
export async function POST(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "缺少作业" }, { status: 400 });

    const sb = adminSupabase();
    const { data: a } = await sb.from("assignments").select("id, end_user_id, source").eq("id", id).maybeSingle();
    if (!a) return NextResponse.json({ ok: false, error: "作业不存在" }, { status: 404 });
    if (a.source !== "parent") {
      return NextResponse.json({ ok: false, error: "后台布置的作业不可删除" }, { status: 403 });
    }

    const { data: bound } = await sb
      .from("parent_bindings")
      .select("id")
      .eq("parent_id", auth.parent_id)
      .eq("end_user_id", a.end_user_id)
      .maybeSingle();
    if (!bound) return NextResponse.json({ ok: false, error: "无权操作" }, { status: 403 });

    const { error } = await sb.from("assignments").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "删除失败" }, { status: 500 });
  }
}
