import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getMpAuth } from "@/lib/mp-session";
import { parseTime } from "../route";

export const dynamic = "force-dynamic";

const NAME_MAX = 30;

/**
 * 修改作业 (仅家长添加的、且属于自己绑定孩子的)
 * POST { id, name, startDate, endDate, startTime?, endTime? }
 */
export async function POST(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const name = String(body?.name || "").trim().slice(0, NAME_MAX);
    if (!id) return NextResponse.json({ ok: false, error: "缺少作业" }, { status: 400 });
    if (!name) return NextResponse.json({ ok: false, error: "请填写作业内容" }, { status: 400 });

    const sb = adminSupabase();
    const { data: a } = await sb.from("assignments").select("id, end_user_id, source").eq("id", id).maybeSingle();
    if (!a) return NextResponse.json({ ok: false, error: "作业不存在" }, { status: 404 });
    if (a.source !== "parent") {
      return NextResponse.json({ ok: false, error: "后台布置的作业不可修改" }, { status: 403 });
    }

    const { data: bound } = await sb
      .from("parent_bindings")
      .select("id")
      .eq("parent_id", auth.parent_id)
      .eq("end_user_id", a.end_user_id)
      .maybeSingle();
    if (!bound) return NextResponse.json({ ok: false, error: "无权操作" }, { status: 403 });

    const patch: Record<string, string | null> = { name };
    if (body?.startDate) patch.start_date = String(body.startDate).slice(0, 10);
    if (body?.endDate) patch.end_date = String(body.endDate).slice(0, 10);
    // startTime/endTime 显式传 (含 null) 才更新, 没传 → 不动原值
    if (body?.startTime !== undefined) patch.start_time = parseTime(body.startTime);
    if (body?.endTime !== undefined) patch.end_time = parseTime(body.endTime);

    const { error } = await sb.from("assignments").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "保存失败" }, { status: 500 });
  }
}
