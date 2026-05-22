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
 * 上传音频到 OBS, 返回可被发展猫读取的 URL 与路径
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
