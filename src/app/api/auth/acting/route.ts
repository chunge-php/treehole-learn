import { NextResponse } from "next/server";
import { getCurrentSession, setActingChannel } from "@/lib/session";
import { isAdminRole } from "@/lib/auth";

export async function POST(req: Request) {
  const s = getCurrentSession();
  if (!s || !isAdminRole(s.role)) {
    return NextResponse.json({ ok: false, error: "无权限" }, { status: 403 });
  }
  const { channel_id } = await req.json().catch(() => ({ channel_id: null }));
  setActingChannel(channel_id ?? null);
  return NextResponse.json({ ok: true });
}
