"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { shortId } from "@/lib/utils";
import { DIMENSIONS, QTYPES, type AssessmentDimension, type AssessmentQType } from "./_components/constants";

export type AssessmentOption = {
  label: string;
  value: string;
  score?: number;
  explanation?: string;
};

export type MediaItem = { url: string; type: string; name?: string };

export type AssessmentInput = {
  id?: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  media_urls?: MediaItem[];
  project_name?: string | null;
  dimension: AssessmentDimension;
  qtype: AssessmentQType;
  options?: AssessmentOption[] | null;
  answer?: string | null;
  sort_order: number;
  status?: "active" | "disabled";
};

export async function listAssessments(params: {
  q?: string;
  dimension?: string;
  qtype?: string;
  project_name?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  requireAdmin();
  const sb = adminSupabase();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  let qb = sb.from("assessments").select("*", { count: "exact" });
  if (params.q) qb = qb.or(`title.ilike.%${params.q}%,description.ilike.%${params.q}%,project_name.ilike.%${params.q}%`);
  if (params.dimension) qb = qb.eq("dimension", params.dimension);
  if (params.qtype) qb = qb.eq("qtype", params.qtype);
  if (params.project_name) qb = qb.eq("project_name", params.project_name);
  if (params.status) qb = qb.eq("status", params.status);
  qb = qb.order("sort_order", { ascending: true }).range((page - 1) * pageSize, page * pageSize - 1);
  const { data, count, error } = await qb;
  if (error) throw new Error(error.message);
  return { rows: data || [], total: count || 0 };
}

/** 实时校验序号是否重复 */
export async function checkAssessmentSortOrderAvailable(
  sort_order: number,
  excludeId?: string
): Promise<{ ok: boolean; reason?: string }> {
  requireAdmin();
  if (!Number.isInteger(sort_order) || sort_order < 0) {
    return { ok: false, reason: "请填写 ≥ 0 的整数" };
  }
  const sb = adminSupabase();
  let qb = sb.from("assessments").select("id, title").eq("sort_order", sort_order).limit(1);
  if (excludeId) qb = qb.neq("id", excludeId);
  const { data } = await qb.maybeSingle();
  if (data) return { ok: false, reason: `序号已被题目「${data.title}」占用` };
  return { ok: true };
}

/** 取下一个可用序号 (max + 1) */
export async function nextAssessmentSortOrder(): Promise<number> {
  requireAdmin();
  const sb = adminSupabase();
  const { data } = await sb.from("assessments").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  return ((data?.sort_order as number | undefined) ?? -1) + 1;
}

export async function upsertAssessment(input: AssessmentInput) {
  requireAdmin();
  if (!input.title.trim()) throw new Error("请填写题目标题");
  if (!DIMENSIONS.includes(input.dimension as any)) throw new Error("所属维度无效");
  if (!QTYPES.includes(input.qtype as any)) throw new Error("题型无效");
  if (!Number.isInteger(input.sort_order) || input.sort_order < 0) throw new Error("请填写 ≥ 0 的整数序号");

  const sb = adminSupabase();

  // 序号唯一性预检
  {
    let dupQ = sb.from("assessments").select("id, title").eq("sort_order", input.sort_order).limit(1);
    if (input.id) dupQ = dupQ.neq("id", input.id);
    const { data: dup } = await dupQ.maybeSingle();
    if (dup) throw new Error(`序号 ${input.sort_order} 已被题目「${dup.title}」占用`);
  }

  const payload: any = {
    title: input.title.trim(),
    description: input.description || null,
    cover_url: input.cover_url || null,
    media_urls: input.media_urls || [],
    project_name: (input.project_name || "").trim() || null,
    dimension: input.dimension,
    qtype: input.qtype,
    options: input.qtype === "语音题" ? [] : (input.options || []),
    answer: input.qtype === "语音题" ? null : ((input.answer || "").trim() || null),
    sort_order: input.sort_order,
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
  const { data: existing = [] } = await sb.from("assessments").select("sort_order");
  const sortSet = new Set<number>((existing || []).map((a: any) => a.sort_order));
  let nextSort = ((existing || []).reduce((m: number, a: any) => Math.max(m, a.sort_order ?? -1), -1)) + 1;

  let success = 0;
  const errors: { row: number; message: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const title = String(r["题目标题"] || r["title"] || "").trim();
    if (!title) {
      errors.push({ row: i + 2, message: "题目标题为空" });
      continue;
    }
    const dimension = String(r["所属维度"] || r["dimension"] || "").trim();
    if (!DIMENSIONS.includes(dimension as any)) {
      errors.push({ row: i + 2, message: `所属维度无效: ${dimension || "空"}` });
      continue;
    }
    const qtype = String(r["题型"] || r["qtype"] || "").trim();
    if (!QTYPES.includes(qtype as any)) {
      errors.push({ row: i + 2, message: `题型无效: ${qtype || "空"}` });
      continue;
    }

    let options: AssessmentOption[] = [];
    if (qtype !== "语音题") {
      const raw = String(r["题目内容"] || r["options"] || "").trim();
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) options = parsed;
        } catch {
          options = raw.split(/[|；;]/).map((s, idx) => ({ label: s.trim(), value: String.fromCharCode(65 + idx) })).filter(o => o.label);
        }
      }
    }

    let sortOrder: number;
    const sortRaw = r["序号"] ?? r["sort_order"];
    if (sortRaw != null && sortRaw !== "") {
      sortOrder = Number(sortRaw);
      if (!Number.isInteger(sortOrder) || sortOrder < 0) {
        errors.push({ row: i + 2, message: "序号必须是 ≥ 0 的整数" });
        continue;
      }
      if (sortSet.has(sortOrder)) {
        errors.push({ row: i + 2, message: `序号 ${sortOrder} 已被占用` });
        continue;
      }
    } else {
      // 自动分配
      while (sortSet.has(nextSort)) nextSort++;
      sortOrder = nextSort;
    }
    sortSet.add(sortOrder);
    nextSort = Math.max(nextSort, sortOrder + 1);

    const answer = qtype === "语音题" ? null : (String(r["答案"] || r["answer"] || "").trim() || null);

    const { error } = await sb.from("assessments").insert({
      id: shortId("as"),
      title,
      description: r["描述"] || r["description"] || null,
      cover_url: r["封面"] || r["cover_url"] || null,
      media_urls: [],
      project_name: r["所属项目"] || r["project_name"] || null,
      dimension,
      qtype,
      options,
      answer,
      sort_order: sortOrder,
      status: "active"
    });
    if (error) errors.push({ row: i + 2, message: error.message });
    else success++;
  }
  revalidatePath("/assessments");
  return { total: rows.length, success, failed: rows.length - success, errors };
}

/** 返回已有的 project_name 去重列表 (用于表单下拉/筛选) */
export async function listProjectNames(): Promise<string[]> {
  requireAdmin();
  const sb = adminSupabase();
  const { data = [] } = await sb.from("assessments")
    .select("project_name")
    .not("project_name", "is", null);
  const set = new Set<string>();
  (data || []).forEach((r: any) => { if (r.project_name) set.add(r.project_name); });
  return Array.from(set).sort();
}
