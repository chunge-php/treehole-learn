/**
 * POST /api/app/face-check/finalize — 多模态评估 (人脸识别后)
 *
 *  header: Authorization: Bearer <token>
 *  body:   { audio_url?, video_url?, txt_url?, audio_file_id?, video_file_id?, txt_file_id? }
 *          全部选填; 一期算法用本地随机模拟, 文件 URL 仅记录用于审计/二期对接真接口
 *  resp:   { ok, multimodal: {...}, game: {...} }
 *          字段跟首页 /api/app/home/today 的 ready 态 multimodal/game 完全一致, 前端可直接更新首页 state
 *
 * 一期: 本地查表算分 (generateRandomScores + evaluate)
 * 二期 TODO: 真接发展猫多模态 API (env FAZHANMAO_URL), 拿真 11 项分值
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireAppAuth } from "@/lib/app-session";
import { generateRandomScores, evaluate, toExternalJson } from "@/lib/multimodal/scoring";
import { extractKeywords } from "@/lib/multimodal/keywords";
import { updateProfileFromMultimodal } from "@/lib/profile/sync";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = requireAppAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({} as any));
  const audio_url = String(body?.audio_url || "");
  const video_url = String(body?.video_url || "");
  const txt_url   = String(body?.txt_url   || "");
  const audio_file_id = String(body?.audio_file_id || "");
  const video_file_id = String(body?.video_file_id || "");
  const txt_file_id   = String(body?.txt_file_id   || "");

  const sb = adminSupabase();
  const { data: student } = await sb.from("end_users")
    .select("id, name, status, seq_no")
    .eq("id", auth.payload.student_id).maybeSingle();
  if (!student) return NextResponse.json({ ok: false, error: "学生不存在", code: "NOT_FOUND" }, { status: 404 });
  if (student.status !== "active") {
    return NextResponse.json({ ok: false, error: "账号已禁用", code: "ACCOUNT_DISABLED" }, { status: 403 });
  }
  const xxlUserId = `XXL${String((student as any).seq_no || 0).padStart(7, "0")}`;

  // === 一期: 本地随机生成 11 项分值 (二期接发展猫真接口) ===
  const scores = generateRandomScores("normal");
  const result = evaluate(scores);

  // 对外 JSON (按多模态文档 3.2 格式) — 用真实上传的 file_id 填充
  const externalJson = toExternalJson(result, {
    user_id: xxlUserId,
    audio_id: audio_file_id || (audio_url ? audio_url.split("/").pop() || "" : ""),
    video_id: video_file_id || (video_url ? video_url.split("/").pop() || "" : ""),
    txt_id:   txt_file_id   || (txt_url   ? txt_url.split("/").pop()   || "" : "")
  });

  // 同步学生档案 (静默, 跟 AI 聊天一样不推 profile_updated)
  try {
    await updateProfileFromMultimodal({
      end_user_id: auth.payload.student_id,
      result, externalJson,
      by: null
    });
  } catch (e: any) {
    console.error("[face-check] profile sync failed:", e?.message || e);
    // 不阻塞返回, 学生还是能看到本次结果
  }

  // 关键词 (从 11 项分值查表)
  const keywords = extractKeywords(scores);

  return NextResponse.json({
    ok: true,
    multimodal: {
      vitality: result.composite,
      stress: Math.max(0, 100 - result.dimensions.stress),
      state_label: result.state_label,
      level: result.final_level,
      comment: result.comment,
      keywords,
      evaluated_at: new Date().toISOString()
    },
    game: {
      name: result.recommendation.game.name,
      keywords: result.recommendation.game.keywords,
      cover_url: null,
      duration_min: 3
    },
    // 调试用: 返回完整原始数据 (前端不必展示)
    debug: {
      raw_scores: scores,
      dimensions: result.dimensions,
      adjustments: result.adjustments,
      external_json: externalJson,
      mode: "local_simulation"   // 一期标记, 二期接发展猫后改 "fazhanmao_real"
    }
  });
}
