import { NextResponse } from "next/server";
import { code2Session, getPhoneNumber } from "@/lib/wechat";
import { findOrCreateByOpenId, setParentPhone, touchLogin, loginResult } from "@/lib/mp-parents";
import { autoBindByPhone } from "@/lib/mp-bindings";

export const dynamic = "force-dynamic";

/**
 * 本机号码一键登录 (微信 getPhoneNumber)
 * 入参: { loginCode, phoneCode }
 *   loginCode = wx.login() 返回的 code (拿 openid)
 *   phoneCode = <button open-type="getPhoneNumber"> 回调 e.detail.code (拿手机号)
 * 出参: { ok, token, parent }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const loginCode = String(body?.loginCode || "").trim();
    const phoneCode = String(body?.phoneCode || "").trim();
    if (!loginCode) return NextResponse.json({ ok: false, error: "缺少 loginCode" }, { status: 400 });
    if (!phoneCode) return NextResponse.json({ ok: false, error: "缺少 phoneCode" }, { status: 400 });

    const { openid, unionid } = await code2Session(loginCode);
    const phone = await getPhoneNumber(phoneCode);

    const parent = await findOrCreateByOpenId(openid, { union_id: unionid });
    await setParentPhone(parent.id, phone);
    await autoBindByPhone(parent.id, phone);
    await touchLogin(parent.id);
    return NextResponse.json(loginResult({ ...parent, phone }));
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "一键登录失败" }, { status: 500 });
  }
}
