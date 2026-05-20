import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminSupabase } from "@/lib/supabase/admin";
import { setSessionCookie, signSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "");
    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "请填写账号和密码" }, { status: 400 });
    }
    const sb = adminSupabase();
    const { data: account, error } = await sb
      .from("accounts")
      .select("id, username, display_name, password_hash, role, channel_id, status, avatar_url")
      .eq("username", username)
      .maybeSingle();

    if (error || !account) {
      return NextResponse.json({ ok: false, error: "账号或密码错误" }, { status: 401 });
    }
    if (account.status !== "active") {
      return NextResponse.json({ ok: false, error: "账号已被停用" }, { status: 403 });
    }
    const ok = await bcrypt.compare(password, account.password_hash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "账号或密码错误" }, { status: 401 });
    }

    await sb.from("accounts").update({ last_login_at: new Date().toISOString() }).eq("id", account.id);

    const token = signSession({
      account_id: account.id,
      username: account.username,
      display_name: account.display_name,
      role: account.role,
      channel_id: account.channel_id,
      avatar_url: account.avatar_url
    });
    setSessionCookie(token);
    return NextResponse.json({ ok: true, role: account.role });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "登录失败" }, { status: 500 });
  }
}
