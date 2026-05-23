import { NextResponse } from "next/server";
import { code2Session } from "@/lib/wechat";
import { findOrCreateByOpenId, touchLogin, loginResult } from "@/lib/mp-parents";
import { autoBindByPhone } from "@/lib/mp-bindings";

export const dynamic = "force-dynamic";

/**
 * 微信授权登录
 * 入参: { code, nickname?, avatar? }  code = wx.login() 返回值
 * 出参: { ok, token, parent }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    if (!code) return NextResponse.json({ ok: false, error: "缺少登录 code" }, { status: 400 });

    const { openid, unionid } = await code2Session(code);
    const parent = await findOrCreateByOpenId(openid, {
      union_id: unionid,
      nickname: body?.nickname ? String(body.nickname) : null,
      avatar_url: body?.avatar ? String(body.avatar) : null
    });
    if (parent.phone) await autoBindByPhone(parent.id, parent.phone);
    await touchLogin(parent.id);
    return NextResponse.json(loginResult(parent));
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "登录失败" }, { status: 500 });
  }
}
