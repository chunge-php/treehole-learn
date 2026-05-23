import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getMpAuth } from "@/lib/mp-session";

export const dynamic = "force-dynamic";

/** 用户删除自己的反馈 POST { id } */
export async function POST(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "缺少反馈" }, { status: 400 });

    const sb = adminSupabase();
    const { error } = await sb.from("mp_feedback").delete().eq("id", id).eq("parent_id", auth.parent_id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "删除失败" }, { status: 500 });
  }
}
