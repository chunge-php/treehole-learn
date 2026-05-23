import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { code2Session } from "@/lib/wechat";
import { findOrCreateByPhone, touchLogin, loginResult } from "@/lib/mp-parents";

export const dynamic = "force-dynamic";

/**
 * 换号登录第二步: 校验验证码并登录
 * 入参: { phone, code, loginCode? }
 *   loginCode 可选: 传则把该手机号账号与当前微信 openid 关联
 * 出参: { ok, token, parent }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = String(body?.phone || "").trim();
    const code = String(body?.code || "").trim();
    if (!/^1\d{10}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: "请输入正确的手机号" }, { status: 400 });
    }
    if (!code) return NextResponse.json({ ok: false, error: "请输入验证码" }, { status: 400 });

    const sb = adminSupabase();
    const { data: row } = await sb
      .from("mp_sms_codes")
      .select("*")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return NextResponse.json({ ok: false, error: "请先获取验证码" }, { status: 400 });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ ok: false, error: "验证码已过期" }, { status: 400 });
    }
    if (row.code !== code) {
      return NextResponse.json({ ok: false, error: "验证码错误" }, { status: 400 });
    }

    await sb.from("mp_sms_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    let openid: string | null = null;
    const loginCode = String(body?.loginCode || "").trim();
    if (loginCode) {
      try {
        openid = (await code2Session(loginCode)).openid;
      } catch {
        openid = null; // openid 关联失败不阻断短信登录
      }
    }

    const parent = await findOrCreateByPhone(phone, openid);
    await touchLogin(parent.id);
    return NextResponse.json(loginResult(parent));
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "登录失败" }, { status: 500 });
  }
}
