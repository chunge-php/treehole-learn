// 华为云 OBS (S3 兼容) 音频上传
// 路径严格格式: {uid}/{code}_{MM-DD-HH-mm}/{rand}.{ext} (发展猫按此读取)
import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { customAlphabet } from "nanoid";

const nano = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);
const pad = (n: number) => String(n).padStart(2, "0");

export function obsConfigured(): boolean {
  return !!(process.env.HUAWEI_OSS_ACCESS_KEY_ID && process.env.HUAWEI_OSS_ACCESS_KEY_SECRET && process.env.HUAWEI_OSS_ENDPOINT);
}

function client(): S3Client {
  return new S3Client({
    region: process.env.HUAWEI_OSS_REGION || "cn-north-4",
    endpoint: process.env.HUAWEI_OSS_ENDPOINT!,   // 如 https://obs.cn-north-4.myhuaweicloud.com
    credentials: {
      accessKeyId: process.env.HUAWEI_OSS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.HUAWEI_OSS_ACCESS_KEY_SECRET!,
    },
    forcePathStyle: false,
  });
}

/**
 * 多模态文件上传 OBS (App 端人脸识别多模态用)
 * 严格按《学习力项目多模态交互的技术需求文档》3.1 节路径规范:
 *   audio:  data/{user_id}/audio/{timestamp}/{timestamp}{user_id}raw.wav
 *   video:  data/{user_id}/video/{timestamp}/{timestamp}{user_id}raw.mp4
 *   script: data/{user_id}/script/{timestamp}/{timestamp}{user_id}raw.txt
 *
 * @param user_id  XXL+7位数字, 例如 XXL0000001
 * @param kind     audio (wav 16kHz) / video (mp4 25fps) / script (txt UTF-8)
 * @param body     文件二进制
 *
 * 返回 file_id = `{timestamp}{user_id}raw.{ext}` (作为发展猫 API 的 audio_id / video_id / txt_id)
 */
export async function uploadMultimodalToObs(
  body: Buffer,
  opts: { user_id: string; kind: "audio" | "video" | "script"; contentType: string; ext?: string }
): Promise<{ url: string; path: string; file_id: string; timestamp: string }> {
  if (!obsConfigured()) throw new Error("华为 OBS 未配置 (检查 HUAWEI_OSS_* 环境变量)");
  if (!/^XXL\d{7,}$/.test(opts.user_id)) throw new Error(`user_id 必须是 XXL+7位数字格式, 收到: ${opts.user_id}`);

  const defaultExt: Record<string, string> = { audio: "wav", video: "mp4", script: "txt" };
  const ext = opts.ext || defaultExt[opts.kind];
  const now = new Date();
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const file_id = `${ts}${opts.user_id}raw.${ext}`;
  const key = `data/${opts.user_id}/${opts.kind}/${ts}/${file_id}`;
  const bucket = process.env.HUAWEI_COS_BUCKET || "aiemotion";

  await client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: opts.contentType,
  }));

  const prefix = (process.env.HUAWEI_OSS_URL_PREFIX || "").replace(/\/$/, "");
  return {
    url: prefix ? `${prefix}/${key}` : key,
    path: `/${key}`,
    file_id,
    timestamp: ts
  };
}

/**
 * 上传音频到 OBS, 返回可被发展猫读取的 URL 与路径 (后台测评报告语音题专用, 路径跟多模态文档不同)
 * @param uid  用户 id (后台测评无真实用户时传 "1")
 * @param code 报告流水号 (report_sessions.code)
 */
export async function uploadAudioToObs(
  body: Buffer,
  opts: { uid: string; code: string; ext: string; contentType: string }
): Promise<{ url: string; path: string }> {
  if (!obsConfigured()) throw new Error("华为 OBS 未配置 (检查 HUAWEI_OSS_* 环境变量)");
  const now = new Date();
  const dir = `${opts.uid}/${opts.code}_${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const key = `${dir}/${nano()}.${opts.ext}`;
  const bucket = process.env.HUAWEI_COS_BUCKET || "aiemotion";

  await client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: opts.contentType,
  }));

  const prefix = (process.env.HUAWEI_OSS_URL_PREFIX || "").replace(/\/$/, "");
  return { url: prefix ? `${prefix}/${key}` : key, path: `/${key}` };
}
