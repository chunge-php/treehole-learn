"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { updateProfileFromReport } from "@/lib/profile/sync";

export type StudentOpt = {
  id: string; name: string; phone: string; grade: string;
  store?: string; channel?: string;
};

export async function listStudents(): Promise<StudentOpt[]> {
  requireAdmin();
  const sb = adminSupabase();
  const { data, error } = await sb
    .from("end_users")
    .select("id, name, phone, grade, stores(name), channels(name)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data || []).map((u: any) => ({
    id: u.id, name: u.name, phone: u.phone || "", grade: u.grade || "",
    store: u.stores?.name, channel: u.channels?.name
  }));
}

export type StudentDossier = {
  student: any;
  profile: any | null;
  reports: Array<{
    id: string; code: string | null; status: string; name: string;
    answered_count: number; total_questions: number;
    created_at: string; completed_at: string | null;
    has_report: boolean;
  }>;
};

export async function getStudentDossier(end_user_id: string): Promise<StudentDossier | null> {
  requireAdmin();
  const sb = adminSupabase();
  const { data: student } = await sb
    .from("end_users")
    .select("*, stores(name), channels(name)")
    .eq("id", end_user_id)
    .maybeSingle();
  if (!student) return null;

  const [{ data: profile }, { data: reports }] = await Promise.all([
    sb.from("user_profiles").select("*").eq("end_user_id", end_user_id).maybeSingle(),
    sb.from("report_sessions")
      .select("id, code, status, name, answered_count, total_questions, created_at, completed_at, report_data")
      .eq("end_user_id", end_user_id)
      .order("created_at", { ascending: false })
      .limit(30)
  ]);

  return {
    student,
    profile: profile || null,
    reports: (reports || []).map((r: any) => ({
      id: r.id, code: r.code, status: r.status, name: r.name,
      answered_count: r.answered_count, total_questions: r.total_questions,
      created_at: r.created_at, completed_at: r.completed_at,
      has_report: !!r.report_data
    }))
  };
}

/** 重置学生档案: 删除 user_profiles 整行, 然后从最近一条已完成的报告自动重建 */
export async function resetStudentProfile(end_user_id: string): Promise<{
  ok: boolean;
  message: string;
  rebuilt_from_report?: string;
}> {
  const s = requireAdmin();
  const sb = adminSupabase();

  // 1. 删除整行
  const { error: delErr } = await sb.from("user_profiles").delete().eq("end_user_id", end_user_id);
  if (delErr) return { ok: false, message: `删除失败: ${delErr.message}` };

  // 2. 找最近一条已完成 + 有 report_data 的测评 → 自动重建
  const { data: latestReport } = await sb.from("report_sessions")
    .select("id, code, report_data, completed_at")
    .eq("end_user_id", end_user_id)
    .eq("status", "completed")
    .not("report_data", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestReport?.report_data) {
    try {
      await updateProfileFromReport({
        end_user_id,
        report_data: latestReport.report_data,
        session_id: latestReport.id,
        by: s.account_id
      });
      revalidatePath("/tests/profile");
      return { ok: true, message: "档案已重置并基于最近一次测评报告重建", rebuilt_from_report: latestReport.code || latestReport.id };
    } catch (e: any) {
      revalidatePath("/tests/profile");
      return { ok: true, message: `档案已清空, 但从测评报告重建失败: ${e?.message || e}` };
    }
  }

  revalidatePath("/tests/profile");
  return { ok: true, message: "档案已清空 (该学生暂无已完成的测评报告, 未触发重建)" };
}
