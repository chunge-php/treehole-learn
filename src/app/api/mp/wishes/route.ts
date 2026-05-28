/**
 * GET /api/mp/wishes — 家长读当前选中孩子的信件列表
 * GET /api/mp/wishes?id=xx — 取单封信详情
 *
 *   header:  Authorization: Bearer <mp_token>
 *   query:   ?endUserId=eu_xxx (省略=家长当前/首选孩子) / ?id=
 *   resp:    { ok, student, list:[{id,title,year,month,createdAt,preview}] }
 *           或 { ok, student, item:{id,title,year,month,content,createdAt} }
 *
 * 一封信由 App 端学生手动添加 (POST /api/app/wishes), 平台只读. 按年-月倒序.
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getMpAuth } from "@/lib/mp-session";
import { resolveChild } from "@/lib/mp-bindings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = getMpAuth(req);
  if (!auth) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const id = (url.searchParams.get("id") || "").trim();
    const child = await resolveChild(auth.parent_id, url.searchParams.get("endUserId"));
    if (!child) return NextResponse.json({ ok: true, student: null, list: [] });

    const sb = adminSupabase();

    if (id) {
      const { data, error } = await sb
        .from("student_wishes")
        .select("id, end_user_id, title, content, year, month, created_at")
        .eq("id", id)
        .eq("end_user_id", child.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return NextResponse.json({ ok: false, error: "信件不存在" }, { status: 404 });
      const item = data as any;
      return NextResponse.json({
        ok: true,
        student: { id: child.id, name: child.name },
        item: {
          id: item.id,
          title: item.title,
          year: item.year,
          month: item.month,
          content: item.content,
          createdAt: item.created_at
        }
      });
    }

    const { data, error } = await sb
      .from("student_wishes")
      .select("id, title, content, year, month, created_at")
      .eq("end_user_id", child.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    // 临时 debug: 直接试一遍不带 order 的查询, 看是不是 order 的锅
    const probe = await sb.from("student_wishes")
      .select("id, end_user_id, title")
      .eq("end_user_id", child.id);

    const list = (data || []).map((w: any) => ({
      id: w.id,
      title: w.title,
      year: w.year,
      month: w.month,
      createdAt: w.created_at,
      preview: String(w.content || "").slice(0, 40)
    }));
    return NextResponse.json({
      ok: true,
      student: { id: child.id, name: child.name },
      list,
      _debug: {
        main_rows: (data || []).length,
        main_err: error,
        probe_rows: (probe.data || []).length,
        probe_err: probe.error,
        probe_first: probe.data?.[0] || null,
        child_id_param: url.searchParams.get("endUserId"),
        child_resolved: child.id
      }
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "读取失败" }, { status: 500 });
  }
}
