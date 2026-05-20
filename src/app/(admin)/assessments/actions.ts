"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { shortId } from "@/lib/utils";

export type AssessmentDimension = "learning_attitude" | "learning_method" | "learning_ability" | "learning_habit";
export type AssessmentQType = "single" | "multiple" | "text";

export type AssessmentOption = {
  label: string;
  value: string;
  score?: number;
  explanation?: string;
};

export type AssessmentInput = {
  id?: string;
  project_id?: string | null;
  dimension: AssessmentDimension;
  qtype: AssessmentQType;
  title: string;
  options?: AssessmentOption[] | null;
  answer?: any;
  explanation?: string | null;
  score?: number | null;
  sort_order?: number | null;
  status?: "active" | "disabled";
};

const DIM_FROM_CN: Record<string, AssessmentDimension> = {
  学习态度: "learning_attitude",
  学习方法: "learning_method",
  学习能力: "learning_ability",
  学习习惯: "learning_habit"
};

const QTYPE_FROM_CN: Record<string, AssessmentQType> = {
  单选: "single",
  多选: "multiple",
  简答: "text"
};

export async function listAssessments(params: {
  q?: string;
  dimension?: string;
  qtype?: string;
  project_id?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  requireAdmin();
  const sb = adminSupabase();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  let qb = sb.from("assessments").select("*, top_types(name)", { count: "exact" });
  if (params.q) qb = qb.ilike("title", `%${params.q}%`);
  if (params.dimension) qb = qb.eq("dimension", params.dimension);
  if (params.qtype) qb = qb.eq("qtype", params.qtype);
  if (params.project_id) qb = qb.eq("project_id", params.project_id);
  if (params.status) qb = qb.eq("status", params.status);
  qb = qb.order("sort_order", { ascending: true }).order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  const { data, count, error } = await qb;
  if (error) throw new Error(error.message);
  return { rows: data || [], total: count || 0 };
}

export async function upsertAssessment(input: AssessmentInput) {
  requireAdmin();
  const sb = adminSupabase();
  const payload = {
    project_id: input.project_id || null,
    dimension: input.dimension,
    qtype: input.qtype,
    title: input.title,
    options: input.qtype === "text" ? null : (input.options || []),
    answer: input.answer ?? null,
    explanation: input.explanation || null,
    score: input.score ?? null,
    sort_order: input.sort_order ?? 0,
    status: input.status || "active"
  };
  if (input.id) {
    const { error } = await sb.from("assessments").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const id = shortId("as");
    const { error } = await sb.from("assessments").insert({ id, ...payload });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/assessments");
  return { ok: true };
}

export async function deleteAssessment(id: string) {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb.from("assessments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/assessments");
  return { ok: true };
}

export async function toggleAssessmentStatus(id: string, status: "active" | "disabled") {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb.from("assessments").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/assessments");
  return { ok: true };
}

export async function bulkImportAssessments(rows: Record<string, any>[]) {
  requireAdmin();
  const sb = adminSupabase();
  let success = 0;
  const errors: { row: number; message: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const title = String(r["题目"] || r["title"] || "").trim();
    if (!title) {
      errors.push({ row: i + 2, message: "题目为空" });
      continue;
    }
    const dimRaw = String(r["维度"] || r["dimension"] || "").trim();
    const dimension = DIM_FROM_CN[dimRaw] || (dimRaw as AssessmentDimension);
    if (!["learning_attitude", "learning_method", "learning_ability", "learning_habit"].includes(dimension)) {
      errors.push({ row: i + 2, message: `维度无效：${dimRaw}` });
      continue;
    }
    const qtRaw = String(r["题型"] || r["qtype"] || "").trim();
    const qtype = QTYPE_FROM_CN[qtRaw] || (qtRaw as AssessmentQType);
    if (!["single", "multiple", "text"].includes(qtype)) {
      errors.push({ row: i + 2, message: `题型无效：${qtRaw}` });
      continue;
    }

    let options: AssessmentOption[] | null = null;
    if (qtype !== "text") {
      const raw = String(r["选项"] || r["options"] || "").trim();
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) options = parsed;
        } catch {
          options = raw.split(/[|；;]/).map((s, idx) => {
            const t = s.trim();
            return { label: t, value: String.fromCharCode(65 + idx) };
          }).filter(o => o.label);
        }
      }
    }

    let answer: any = null;
    const ansRaw = String(r["答案"] || r["answer"] || "").trim();
    if (ansRaw) {
      if (qtype === "multiple") {
        answer = ansRaw.split(/[,，|]/).map(s => s.trim()).filter(Boolean);
      } else {
        answer = ansRaw;
      }
    }

    const scoreRaw = r["分值"] ?? r["score"];
    const sortRaw = r["排序"] ?? r["sort_order"];

    const { error } = await sb.from("assessments").insert({
      id: shortId("as"),
      project_id: r["项目ID"] || r["project_id"] || null,
      dimension,
      qtype,
      title,
      options,
      answer,
      explanation: r["解析"] || r["explanation"] || null,
      score: scoreRaw != null && scoreRaw !== "" ? Number(scoreRaw) : null,
      sort_order: sortRaw != null && sortRaw !== "" ? Number(sortRaw) : 0,
      status: "active"
    });
    if (error) errors.push({ row: i + 2, message: error.message });
    else success++;
  }
  revalidatePath("/assessments");
  return { total: rows.length, success, failed: rows.length - success, errors };
}

export async function listProjects() {
  requireAdmin();
  const sb = adminSupabase();
  const { data } = await sb.from("top_types")
    .select("id, name, parent_id")
    .not("parent_id", "is", null)
    .order("sort_order", { ascending: true });
  return data || [];
}
