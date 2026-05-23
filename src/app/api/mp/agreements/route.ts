import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * 读取协议 (公开, 登录页展示用)
 * GET /api/mp/agreements           -> 返回全部 (user + privacy)
 * GET /api/mp/agreements?type=user -> 返回单个
 * 出参: { ok, agreements: [{ type, title, content, version, updatedAt }] }
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const sb = adminSupabase();
    let q = sb.from("agreements").select("type, title, content, version, updated_at");
    if (type) q = q.eq("type", type);
    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const agreements = (data || []).map((a: any) => ({
      type: a.type,
      title: a.title,
      content: a.content,
      version: a.version,
      updatedAt: a.updated_at
    }));
    return NextResponse.json({ ok: true, agreements });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "读取失败" }, { status: 500 });
  }
}
