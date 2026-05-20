import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "th_session";
const ACTING = "th_acting";
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 天

export type SessionPayload = {
  account_id: string;
  username: string;
  display_name: string;
  role: "super_admin" | "admin" | "channel_admin";
  channel_id: string | null;
  avatar_url?: string | null;
  iat: number;
  exp: number;
};

function getSecret() {
  const s = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "treehole-dev-secret-change-me";
  return Buffer.from(s);
}

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fromB64url(s: string) {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signSession(payload: Omit<SessionPayload, "iat" | "exp">) {
  const now = Date.now();
  const full: SessionPayload = { ...payload, iat: now, exp: now + TTL_MS };
  const body = b64url(Buffer.from(JSON.stringify(full)));
  const sig = b64url(createHmac("sha256", getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifySession(token?: string | null): SessionPayload | null {
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
    const payload = JSON.parse(fromB64url(body).toString()) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE);
  cookies().delete(ACTING);
}

export function getCurrentSession(): SessionPayload | null {
  return verifySession(cookies().get(COOKIE)?.value);
}

export function setActingChannel(channelId: string | null) {
  if (channelId) {
    cookies().set(ACTING, channelId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8 // 8h
    });
  } else {
    cookies().delete(ACTING);
  }
}

export function getActingChannelId() {
  return cookies().get(ACTING)?.value || null;
}

/**
 * 当前账号可见的渠道 ID（用于查询）
 * - super_admin / admin: null 表示看全部，或拿到 acting cookie 时只看该渠道
 * - channel_admin: 锁死自己的 channel_id
 */
export function effectiveChannelId(s: SessionPayload | null): string | null {
  if (!s) return "__none__";
  if (s.role === "channel_admin") return s.channel_id;
  return getActingChannelId();
}

export const SESSION_COOKIE = COOKIE;
export const ACTING_COOKIE = ACTING;
