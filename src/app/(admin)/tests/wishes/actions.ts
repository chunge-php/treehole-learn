"use server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { generateLetter, loadLetterTemplate, buildLetterContext } from "@/lib/wish-letter";
import { shortId } from "@/lib/utils";

/** 列出指定学生当月的心愿条目 (测试中心展示用) */
export async function listWishItems(input: { endUserId: string; year: number; month: number }) {
  requireAdmin();
  const sb = adminSupabase();
  const start = new Date(input.year, input.month - 1, 1, 0, 0, 0, 0).toISOString();
  const end   = new Date(input.year, input.month,     1, 0, 0, 0, 0).toISOString();
  const { data, error } = await sb.from("student_wish_items")
    .select("id, content, created_at")
    .eq("end_user_id", input.endUserId)
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((w: any) => ({ id: w.id, content: w.content, createdAt: w.created_at }));
}

/** 测试中心: 替学生加一条心愿 (模拟 App 端写入), 便于不依赖 App 测信件生成 */
export async function addTestWishItem(input: { endUserId: string; content: string; year?: number; month?: number }) {
  requireAdmin();
  const content = String(input.content || "").trim().slice(0, 300);
  if (!content) throw new Error("心愿内容不能为空");
  const sb = adminSupabase();
  const { data: stu } = await sb.from("end_users")
    .select("channel_id, store_id").eq("id", input.endUserId).maybeSingle();
  // 如果指定了 year/month, created_at 设到那个月 15 号 (便于回填历史月份测试)
  let createdAt: string | undefined;
  if (input.year && input.month) {
    createdAt = new Date(input.year, input.month - 1, 15, 12, 0, 0, 0).toISOString();
  }
  const row: any = {
    id: shortId("wi"),
    end_user_id: input.endUserId,
    channel_id: (stu as any)?.channel_id ?? null,
    store_id:   (stu as any)?.store_id ?? null,
    content
  };
  if (createdAt) row.created_at = createdAt;
  const { error } = await sb.from("student_wish_items").insert(row);
  if (error) throw new Error(error.message);
  return { ok: true, id: row.id };
}

/** 测试中心: 删一条心愿条目 */
export async function deleteWishItem(input: { id: string }) {
  requireAdmin();
  const sb = adminSupabase();
  const { error } = await sb.from("student_wish_items").delete().eq("id", input.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export type StudentOpt = {
  id: string; name: string; phone: string; grade: string;
  store?: string; channel?: string;
};

export async function listStudentsForLetter(): Promise<StudentOpt[]> {
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

/** 预览: 不调扣子, 只把档案数据填进 prefix_template 给你看渲染结果 */
export async function previewLetterContext(input: { endUserId: string; year: number; month: number }) {
  requireAdmin();
  const tpl = await loadLetterTemplate();
  const ctx = await buildLetterContext({ ...input, template: tpl });
  return {
    template: { id: tpl.id, code: tpl.code, name: tpl.name, system_role: tpl.system_role, rules: tpl.rules },
    rendered: ctx.rendered,
    placeholders: ctx.placeholders
  };
}

/** 实跑一次 (有 COZE_API_TOKEN + COZE_WORKFLOW_WISH_LETTER 走真; 否则 mock 占位) */
export async function runLetterGeneration(input: { endUserId: string; year: number; month: number }) {
  requireAdmin();
  const r = await generateLetter(input);
  if (!r.ok) throw new Error(r.error);
  return {
    content: r.content,
    mock: r.mock,
    debugUrl: r.debugUrl,
    studentName: r.context.studentName,
    rendered: r.context.rendered
  };
}

/** 把生成的信件保存到 student_wishes 表 (家长立刻能在心愿清单里看到) */
export async function saveWishLetter(input: {
  endUserId: string; year: number; month: number; content: string; title?: string;
}) {
  const s = requireAdmin();
  const sb = adminSupabase();
  const { data: stu } = await sb.from("end_users")
    .select("channel_id, store_id").eq("id", input.endUserId).maybeSingle();
  const row = {
    id: shortId("wsh"),
    end_user_id: input.endUserId,
    channel_id: (stu as any)?.channel_id ?? null,
    store_id:   (stu as any)?.store_id ?? null,
    title: input.title || "孩子给您的一封信",
    content: input.content,
    year: input.year,
    month: Math.min(12, Math.max(1, input.month))
  };
  const { error } = await sb.from("student_wishes").insert(row);
  if (error) throw new Error(error.message);
  void s;
  return { ok: true, id: row.id };
}
