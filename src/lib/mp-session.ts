/**
 * 小程序(家长端) Bearer Token 签发与校验。
 * 前后端独立: 不用 cookie, token 由登录接口返回 body, 前端存 storage,
 * 后续请求带 Authorization: Bearer <token>。HMAC-SHA256 自签名, 无状态。
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 天

export type MpTokenPayload = {
  parent_id: string;
  open_id: string | null;
  phone: string | null;
  iat: number;
  exp: number;
};

function getSecret() {
  const s =
    process.env.MP_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "treehole-mp-dev-secret-change-me";
  return Buffer.from(s);
}

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fromB64url(s: string) {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signMpToken(payload: Omit<MpTokenPayload, "iat" | "exp">) {
  const now = Date.now();
  const full: MpTokenPayload = { ...payload, iat: now, exp: now + TTL_MS };
  const body = b64url(Buffer.from(JSON.stringify(full)));
  const sig = b64url(createHmac("sha256", getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyMpToken(token?: string | null): MpTokenPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64url(createHmac("sha256", getSecret()).update(body).digest());
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(fromB64url(body).toString()) as MpTokenPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** 从请求头取出并校验 token, 返回家长身份; 失败返回 null */
export function getMpAuth(req: Request): MpTokenPayload | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  const token = m ? m[1] : req.headers.get("x-mp-token");
  return verifyMpToken(token);
}
