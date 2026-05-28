"use server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

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
