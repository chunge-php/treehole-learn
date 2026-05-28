/**
 * POST /api/app/auth/login — 学生平板端登录
 *
 *  body: { username: string, password: string }
 *  resp: { ok: true, token: string, student: {...} }
 *      | { ok: false, error: string, code?: string }
 *
 * 错误码:
 *   400 MISSING_FIELDS    - 缺少 username 或 password
 *   401 INVALID_CREDENTIALS - 账号/密码错误
 *   403 ACCOUNT_DISABLED  - 账号被禁用
 *
 * 登录成功后, 服务端会异步更新 last_login_at, 客户端可拿 token 调其他接口
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminSupabase } from "@/lib/supabase/admin";
import { signAppToken } from "@/lib/app-session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "请输入账号和密码", code: "MISSING_FIELDS" }, { status: 400 });
  }

  const sb = adminSupabase();
  const { data: student, error } = await sb
    .from("end_users")
    .select("id, name, login_username, login_password_hash, status, gender, age, grade, school, phone, store_id, channel_id, stores(name), channels(name)")
    .eq("login_username", username)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: "查询失败", code: "DB_ERROR" }, { status: 500 });
  if (!student || !student.login_password_hash) {
    return NextResponse.json({ ok: false, error: "账号或密码错误", code: "INVALID_CREDENTIALS" }, { status: 401 });
  }
  const passOk = await bcrypt.compare(password, student.login_password_hash);
  if (!passOk) {
    return NextResponse.json({ ok: false, error: "账号或密码错误", code: "INVALID_CREDENTIALS" }, { status: 401 });
  }
  if (student.status !== "active") {
    return NextResponse.json({ ok: false, error: "账号已被禁用, 请联系老师", code: "ACCOUNT_DISABLED" }, { status: 403 });
  }

  const token = signAppToken({ student_id: student.id, username: student.login_username });

  // fire-and-forget 更新 last_login_at, 失败不影响登录
  sb.from("end_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", student.id)
    .then(undefined, () => {});

  return NextResponse.json({
    ok: true,
    token,
    student: {
      id: student.id,
      name: student.name,
      username: student.login_username,
      gender: student.gender,
      age: student.age,
      grade: student.grade,
      school: student.school,
      phone: student.phone,
      store: (student as any).stores?.name || null,
      channel: (student as any).channels?.name || null
    }
  });
}
