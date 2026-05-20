import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const revalidate = 86400; // 24h 缓存

/**
 * GET /api/public/divisions
 *   ?level=1                → 所有省/直辖市
 *   ?pid=110000             → 该父级下的市
 *   ?pid=110100             → 该父级下的区/县
 *
 * 直辖市处理: level-2 仅有"市辖区"时, 直接跳到 level-3
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const level = url.searchParams.get("level");
  const pid = url.searchParams.get("pid");

  const sb = adminSupabase();
  let qb = sb.from("divisions").select("id, name, pid, level").order("id");

  if (level) qb = qb.eq("level", Number(level));
  if (pid) qb = qb.eq("pid", Number(pid));

  const { data, error } = await qb;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let rows = data || [];

  // 直辖市穿透: 如果传入的 pid 是省级，且子级仅有一个"市辖区"，则直接返回该"市辖区"下的区县
  if (pid && rows.length === 1 && rows[0].name === "市辖区") {
    const { data: deep } = await sb
      .from("divisions")
      .select("id, name, pid, level")
      .eq("pid", rows[0].id)
      .order("id");
    rows = deep || [];
  }

  return NextResponse.json({ ok: true, rows }, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" }
  });
}
