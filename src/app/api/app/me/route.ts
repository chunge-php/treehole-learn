/**
 * GET /api/app/me — 获取当前登录学生信息 (用于 App 启动时校验 token)
 *
 *  header: Authorization: Bearer <token>
 *  resp:   { ok: true, student: {...} } | 401
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  const sb = adminSupabase();
  const { data: student } = await sb
    .from("end_users")
    .select("id, name, login_username, status, gender, age, grade, school, phone, parent_name, parent_phone, store_id, channel_id, stores(name), channels(name)")
    .eq("id", auth.payload.student_id)
    .maybeSingle();
  if (!student) {
    return NextResponse.json({ ok: false, error: "学生不存在", code: "NOT_FOUND" }, { status: 404 });
  }
  if (student.status !== "active") {
    return NextResponse.json({ ok: false, error: "账号已被禁用", code: "ACCOUNT_DISABLED" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    student: {
      id: student.id,
      name: student.name,
      username: student.login_username,
      gender: student.gender,
      age: student.age,
      grade: student.grade,
      school: student.school,
      phone: student.phone,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      store: (student as any).stores?.name || null,
      channel: (student as any).channels?.name || null
    }
  });
}
