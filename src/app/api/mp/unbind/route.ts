import { NextResponse } from "next/server";
import { getMpAuth } from "@/lib/mp-session";
import { unbind } from "@/lib/mp-bindings";

export const dynamic = "force-dynamic";

/** 解绑自己名下的学生 (原主解绑后该学生才可被他人绑定) */
export async function POST(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const endUserId = String(body?.endUserId || "").trim();
  const r = await unbind(auth.parent_id, endUserId);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
