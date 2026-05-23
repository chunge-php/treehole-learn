/**
 * 微信小程序服务端能力封装。
 * 无 WECHAT_APPID / WECHAT_SECRET 时自动进入 mock 模式 (本地/联调可直接跑通登录)。
 * 配齐 key 后无需改前端, 自动走真实微信接口。
 */
import { createHash } from "node:crypto";

const APPID = process.env.WECHAT_APPID || "";
const SECRET = process.env.WECHAT_SECRET || "";
export const WECHAT_MOCK = !APPID || !SECRET;

export type Code2SessionResult = {
  openid: string;
  unionid: string | null;
  session_key: string | null;
};

/**
 * 用 wx.login 的 code 换取 openid。
 * mock 模式: 用 mockSeed(前端稳定设备id)生成固定 openid; 没传才退化用 jsCode。
 * ⚠️ jsCode 每次登录都变, 不能直接当 mock openid 种子(否则每次都是新账号)。
 */
export async function code2Session(jsCode: string, mockSeed?: string | null): Promise<Code2SessionResult> {
  if (!jsCode) throw new Error("缺少登录 code");
  if (WECHAT_MOCK) {
    const seed = (mockSeed && String(mockSeed).trim()) || jsCode;
    const h = createHash("sha1").update(seed).digest("hex").slice(0, 24);
    return { openid: `mock_openid_${h}`, unionid: null, session_key: null };
  }
  const url =
    `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}` +
    `&js_code=${encodeURIComponent(jsCode)}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = (await res.json()) as any;
  if (data.errcode) throw new Error(`微信登录失败(${data.errcode}): ${data.errmsg}`);
  return { openid: data.openid, unionid: data.unionid || null, session_key: data.session_key || null };
}

let tokenCache: { token: string; exp: number } | null = null;

/** 获取小程序 access_token (内存缓存, 提前 5 分钟过期重取)。 */
async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now()) return tokenCache.token;
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`;
  const res = await fetch(url);
  const data = (await res.json()) as any;
  if (!data.access_token) throw new Error(`获取 access_token 失败: ${data.errmsg || "unknown"}`);
  tokenCache = { token: data.access_token, exp: Date.now() + (data.expires_in - 300) * 1000 };
  return data.access_token;
}

/**
 * 一键登录: 用 getPhoneNumber 按钮返回的 code 换取手机号。
 * 无 key 时返回 MP_MOCK_PHONE (默认 13800138000)。
 */
export async function getPhoneNumber(phoneCode: string): Promise<string> {
  if (!phoneCode) throw new Error("缺少手机号 code");
  if (WECHAT_MOCK) {
    return process.env.MP_MOCK_PHONE || "13800138000";
  }
  const token = await getAccessToken();
  const res = await fetch(
    `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: phoneCode }) }
  );
  const data = (await res.json()) as any;
  if (data.errcode !== 0 || !data.phone_info) {
    throw new Error(`获取手机号失败(${data.errcode}): ${data.errmsg}`);
  }
  return data.phone_info.purePhoneNumber || data.phone_info.phoneNumber;
}
