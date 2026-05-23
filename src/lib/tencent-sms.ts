/**
 * 腾讯云短信发送封装 (SendSms, TC3-HMAC-SHA256 签名)。
 * 无 TENCENT_SECRET_ID / TENCENT_SECRET_KEY 时自动 mock (仅打日志, 始终成功),
 * 配齐 key + 签名/模板后自动走真实发送, 前端无需改动。
 * 文档: https://cloud.tencent.com/document/product/382/55981
 */
import { createHash, createHmac } from "node:crypto";

const SECRET_ID = process.env.TENCENT_SECRET_ID || "";
const SECRET_KEY = process.env.TENCENT_SECRET_KEY || "";
const SDK_APP_ID = process.env.TENCENT_SMS_SDK_APP_ID || "";
const SIGN_NAME = process.env.TENCENT_SMS_SIGN_NAME || "";
const TEMPLATE_ID = process.env.TENCENT_SMS_TEMPLATE_ID || "";
const REGION = process.env.TENCENT_SMS_REGION || "ap-guangzhou";

const HOST = "sms.tencentcloudapi.com";
const SERVICE = "sms";
const VERSION = "2021-01-11";
const ACTION = "SendSms";

export const SMS_MOCK = !SECRET_ID || !SECRET_KEY || !SDK_APP_ID || !SIGN_NAME || !TEMPLATE_ID;

function sha256Hex(s: string) {
  return createHash("sha256").update(s, "utf8").digest("hex");
}
function hmac(key: Buffer | string, s: string) {
  return createHmac("sha256", key).update(s, "utf8").digest();
}

/** 发送验证码短信; 返回是否成功。mock 模式打印验证码方便联调。 */
export async function sendSmsCode(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  if (SMS_MOCK) {
    console.log(`[SMS-MOCK] 向 ${phone} 发送验证码: ${code} (未配置腾讯云 key, 走 mock)`);
    return { ok: true };
  }

  const e164 = phone.startsWith("+") ? phone : `+86${phone}`;
  const payload = JSON.stringify({
    PhoneNumberSet: [e164],
    SmsSdkAppId: SDK_APP_ID,
    SignName: SIGN_NAME,
    TemplateId: TEMPLATE_ID,
    TemplateParamSet: [code]
  });

  const ts = Math.floor(Date.now() / 1000);
  const date = new Date(ts * 1000).toISOString().slice(0, 10);

  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${HOST}\n`;
  const signedHeaders = "content-type;host";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    sha256Hex(payload)
  ].join("\n");

  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const stringToSign = [
    "TC3-HMAC-SHA256",
    String(ts),
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");

  const secretDate = hmac(`TC3${SECRET_KEY}`, date);
  const secretService = hmac(secretDate, SERVICE);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = createHmac("sha256", secretSigning).update(stringToSign, "utf8").digest("hex");

  const authorization =
    `TC3-HMAC-SHA256 Credential=${SECRET_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const res = await fetch(`https://${HOST}`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json; charset=utf-8",
        Host: HOST,
        "X-TC-Action": ACTION,
        "X-TC-Timestamp": String(ts),
        "X-TC-Version": VERSION,
        "X-TC-Region": REGION
      },
      body: payload
    });
    const data = (await res.json()) as any;
    const r = data?.Response;
    if (r?.Error) return { ok: false, error: r.Error.Message };
    const status = r?.SendStatusSet?.[0];
    if (status && status.Code !== "Ok") return { ok: false, error: status.Message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "短信发送异常" };
  }
}
