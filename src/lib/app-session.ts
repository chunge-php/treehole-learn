/**
 * App 端 (学生平板) Bearer Token 签发与校验
 * 前后端独立: 不用 cookie, token 由登录接口返回 body, 前端存本地 storage,
 * 后续请求带 Authorization: Bearer <token>。HMAC-SHA256 自签名, 无状态。
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 天

export type AppTokenPayload = {
  student_id: string;          // end_users.id
  username: string | null;
  iat: number;
  exp: number;
};

function getSecret() {
  const s =
    process.env.APP_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "treehole-app-dev-secret-change-me";
  return Buffer.from(s);
}

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fromB64url(s: string) {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signAppToken(payload: Omit<AppTokenPayload, "iat" | "exp">) {
  const now = Date.now();
  const full: AppTokenPayload = { ...payload, iat: now, exp: now + TTL_MS };
  const body = b64url(Buffer.from(JSON.stringify(full)));
  const sig = b64url(createHmac("sha256", getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyAppToken(token?: string | null): AppTokenPayload | null {
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
    const payload = JSON.parse(fromB64url(body).toString()) as AppTokenPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** 从请求头取出并校验 token, 返回学生身份; 失败返回 null */
export function getAppAuth(req: Request): AppTokenPayload | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  const token = m ? m[1] : req.headers.get("x-app-token");
  return verifyAppToken(token);
}

/** 在路由里强制要求登录, 失败返回标准 401 响应 */
export function requireAppAuth(req: Request): { ok: true; payload: AppTokenPayload } | { ok: false; response: Response } {
  const payload = getAppAuth(req);
  if (!payload) {
    return {
      ok: false,
      response: Response.json({ ok: false, error: "未登录或 token 已过期", code: "UNAUTHORIZED" }, { status: 401 })
    };
  }
  return { ok: true, payload };
}
