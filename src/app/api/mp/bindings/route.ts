import { NextResponse } from "next/server";
import { getMpAuth } from "@/lib/mp-session";
import { listBoundStudents, bindByPhone } from "@/lib/mp-bindings";

export const dynamic = "force-dynamic";

/** 当前家长已绑定的学生列表 */
export async function GET(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  try {
    const students = await listBoundStudents(auth.parent_id);
    return NextResponse.json({ ok: true, students });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "读取失败" }, { status: 500 });
  }
}

/** 手动绑定: 输手机号 (被他人绑定则拒绝, 需原主解绑) */
export async function POST(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const phone = String(body?.phone || "").trim();
  const r = await bindByPhone(auth.parent_id, phone);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
