import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getMpAuth } from "@/lib/mp-session";

export const dynamic = "force-dynamic";

/**
 * 标记作业完成/取消
 * POST { id, done }  仅能操作自己绑定孩子的作业
 */
export async function POST(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const done = !!body?.done;
    if (!id) return NextResponse.json({ ok: false, error: "缺少作业" }, { status: 400 });

    const sb = adminSupabase();
    const { data: a } = await sb.from("assignments").select("id, end_user_id").eq("id", id).maybeSingle();
    if (!a) return NextResponse.json({ ok: false, error: "作业不存在" }, { status: 404 });

    // 校验该作业的学生确实绑定在当前家长名下
    const { data: bound } = await sb
      .from("parent_bindings")
      .select("id")
      .eq("parent_id", auth.parent_id)
      .eq("end_user_id", a.end_user_id)
      .maybeSingle();
    if (!bound) return NextResponse.json({ ok: false, error: "无权操作" }, { status: 403 });

    const { error } = await sb
      .from("assignments")
      .update({ completed_at: done ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "更新失败" }, { status: 500 });
  }
}
