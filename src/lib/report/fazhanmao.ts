// 发展猫 多模态语音情绪 API 客户端
// 旧系统: POST {audio_id, file_dir, file_path} → {code, data:{status/trait/learning_stress_score, audio_id}}
import "server-only";

export type AnxietyExtend = {
  status_anxiety_score: number;   // 状态焦虑
  trait_anxiety_score: number;    // 特质焦虑
  learning_stress_score: number;  // 学习/感知压力
  audio_id?: string;
  timestamp?: string;
};

const DEFAULT_URL = "http://gpu.fazhanmao.com:9096/system/learning_ability/get_file_paths";
/** 测试语音 (已存在于华为 OBS), 一键答完/调试用 */
export const SAMPLE_AUDIO =
  process.env.FAZHANMAO_SAMPLE_AUDIO ||
  "https://aiemotion.obs.cn-north-4.myhuaweicloud.com/1/XXL0001_12-03-16-32/3bc9ed9a0bc5b8ba.wav";

/**
 * 调发展猫分析语音 → 焦虑三分; 失败返回 null (不阻塞作答)
 * @param audioUrlOrPath OBS 完整 URL 或路径 (/1/XXL.../x.wav)
 * @param audioId        报告流水号 (report_sessions.code)
 */
export async function analyzeAudio(audioUrlOrPath: string, audioId: string): Promise<AnxietyExtend | null> {
  const endpoint = process.env.FAZHANMAO_URL || DEFAULT_URL;
  let filePath = audioUrlOrPath;
  try { filePath = new URL(audioUrlOrPath).pathname; } catch { /* 已是路径 */ }
  if (!filePath) return null;
  const fileDir = filePath.slice(0, filePath.lastIndexOf("/"));

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio_id: audioId, file_dir: fileDir, file_path: filePath }),
      signal: AbortSignal.timeout(30000),
    });
    const json: any = await res.json().catch(() => null);
    if (!json || json.code !== 200 || !json.data) return null;
    const d = json.data;
    return {
      status_anxiety_score: Number(d.status_anxiety_score ?? 0),
      trait_anxiety_score: Number(d.trait_anxiety_score ?? 0),
      learning_stress_score: Number(d.learning_stress_score ?? 0),
      audio_id: d.audio_id ?? audioId,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
