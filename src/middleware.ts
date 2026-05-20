import { NextResponse, type NextRequest } from "next/server";
import { verifySessionEdge, SESSION_COOKIE } from "@/lib/session-edge";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/public", "/_next", "/favicon"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) return NextResponse.next();
  if (path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionEdge(token);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // 渠道商不能进 /admin-only 区域
  const adminOnly = ["/settings", "/accounts"];
  if (session.role === "channel_admin" && adminOnly.some(p => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"]
};
