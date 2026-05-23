import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { sendSmsCode, SMS_MOCK } from "@/lib/tencent-sms";
import { shortId } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RESEND_SECONDS = 60;
const EXPIRE_MINUTES = 5;

/**
 * 换号登录第一步: 发送短信验证码
 * 入参: { phone }
 * 出参: { ok }  (mock 模式下额外返回 devCode 便于联调)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = String(body?.phone || "").trim();
    if (!/^1\d{10}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: "请输入正确的手机号" }, { status: 400 });
    }

    const sb = adminSupabase();
    // 60s 内禁止重复发送
    const since = new Date(Date.now() - RESEND_SECONDS * 1000).toISOString();
    const { data: recent } = await sb
      .from("mp_sms_codes")
      .select("created_at")
      .eq("phone", phone)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    if (recent) {
      return NextResponse.json({ ok: false, error: "验证码已发送, 请稍后再试" }, { status: 429 });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires_at = new Date(Date.now() + EXPIRE_MINUTES * 60 * 1000).toISOString();
    await sb.from("mp_sms_codes").insert({ id: shortId("sms"), phone, code, scene: "login", expires_at });

    const r = await sendSmsCode(phone, code);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error || "短信发送失败" }, { status: 502 });

    return NextResponse.json(SMS_MOCK ? { ok: true, devCode: code } : { ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "发送失败" }, { status: 500 });
  }
}
