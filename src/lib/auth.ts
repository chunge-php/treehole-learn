import { redirect } from "next/navigation";
import { getCurrentSession, type SessionPayload } from "./session";

export function requireSession(): SessionPayload {
  const s = getCurrentSession();
  if (!s) redirect("/login");
  return s;
}

export function requireAdmin(): SessionPayload {
  const s = requireSession();
  if (s.role === "channel_admin") redirect("/dashboard");
  return s;
}

export function isAdminRole(role: string) {
  return role === "admin" || role === "super_admin";
}
