/**
 * 扣子 (Coze) 工作流 API 封装
 *  - 国内: https://api.coze.cn
 *  - 文档: https://www.coze.cn/open/docs/developer_guides/workflow_stream_run
 *
 * 提供:
 *   runWorkflow      非流式调用 (POST /v1/workflow/run)
 *   streamWorkflow   流式调用   (POST /v1/workflow/stream_run, SSE)
 *
 * COZE_API_TOKEN 留空时自动走 mock, 方便本地无凭据联调。
 */
import "server-only";

export type CozeParameters = Record<string, any>;

export type WorkflowRunInput = {
  workflowId: string;
  parameters: CozeParameters;
  botId?: string;
  appId?: string;
  extra?: Record<string, any>;
};

export type WorkflowRunResult = {
  data: any;           // 工作流返回的 output (可能是 string / object)
  cost?: string;       // token 消耗
  token?: number;
  debug_url?: string;
  msg?: string;
  code?: number;
  raw: any;
};

const BASE = process.env.COZE_BASE_URL || "https://api.coze.cn";
const TOKEN = process.env.COZE_API_TOKEN || "";

/** 上传文件到扣子, 拿到 file_id (有效期 3 个月)
 *  支持图片 JPG/PNG/GIF/WEBP/HEIC/HEIF/BMP/PCD/TIFF + 文档/视频/音频
 *  PAT 必须有 uploadFile 权限
 */
export async function uploadFileToCoze(file: File | Blob, filename: string): Promise<{ file_id: string; bytes: number; file_name: string }> {
  if (!cozeConfigured()) throw new Error("COZE_API_TOKEN 未配置");
  const form = new FormData();
  form.append("file", file, filename);
  const res = await fetch(`${BASE}/v1/files/upload`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${TOKEN}` },   // 不要手动设 Content-Type, FormData 自动带 boundary
    body: form,
    cache: "no-store"
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.code !== 0) {
    throw new Error(`扣子上传失败 [${res.status}]: ${json?.msg || JSON.stringify(json)}`);
  }
  return {
    file_id: json.data.id,
    bytes: json.data.bytes,
    file_name: json.data.file_name
  };
}

export function cozeConfigured(): boolean {
  return !!TOKEN;
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${TOKEN}`
  };
}

/** 非流式 */
export async function runWorkflow(input: WorkflowRunInput): Promise<WorkflowRunResult> {
  if (!cozeConfigured()) {
    return mockResult(input, false);
  }
  const body = {
    workflow_id: input.workflowId,
    parameters: input.parameters || {},
    ...(input.botId ? { bot_id: input.botId } : {}),
    ...(input.appId ? { app_id: input.appId } : {}),
    ...(input.extra || {})
  };
  const res = await fetch(`${BASE}/v1/workflow/run`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json?.code && json.code !== 0)) {
    throw new Error(`Coze 调用失败 [${res.status}]: ${json?.msg || JSON.stringify(json)}`);
  }
  // data 字段经常是字符串化的 JSON, 顺手解析下
  let parsedData = json?.data;
  if (typeof parsedData === "string") {
    try { parsedData = JSON.parse(parsedData); } catch { /* 保留原文 */ }
  }
  return {
    data: parsedData,
    cost: json?.cost,
    token: json?.token,
    debug_url: json?.debug_url,
    msg: json?.msg,
    code: json?.code,
    raw: json
  };
}

/** 流式 SSE 事件 */
export type CozeStreamEvent =
  | { type: "delta"; text: string; raw?: any }            // 大模型输出增量
  | { type: "message"; text: string; raw?: any }          // 完整消息 (一次性返回)
  | { type: "done"; output?: any; raw?: any }             // 工作流结束
  | { type: "error"; code?: number; message: string; raw?: any }
  | { type: "interrupt"; raw?: any }                      // 节点中断 (问询用户)
  | { type: "node"; nodeId?: string; nodeName?: string; raw?: any }
  | { type: "other"; event: string; raw?: any };

/** 流式调用; AsyncIterable 给前端推 SSE 用 */
export async function* streamWorkflow(input: WorkflowRunInput): AsyncGenerator<CozeStreamEvent> {
  if (!cozeConfigured()) {
    yield* mockStream(input);
    return;
  }
  const body = {
    workflow_id: input.workflowId,
    parameters: input.parameters || {},
    ...(input.botId ? { bot_id: input.botId } : {}),
    ...(input.appId ? { app_id: input.appId } : {}),
    ...(input.extra || {})
  };
  const res = await fetch(`${BASE}/v1/workflow/stream_run`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    cache: "no-store"
  });
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    yield { type: "error", code: res.status, message: `Coze 流式调用失败 [${res.status}]: ${txt}`.slice(0, 500) };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const debug = process.env.COZE_DEBUG === "1";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE 协议: 以空行 \n\n 分割事件
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (debug) console.log("[coze:sse:raw]", JSON.stringify(chunk));
      const evt = parseSseChunk(chunk);
      if (evt) {
        if (debug) console.log("[coze:sse:parsed]", evt.type, JSON.stringify(evt).slice(0, 200));
        yield evt;
      }
    }
  }
  if (buffer.trim()) {
    if (debug) console.log("[coze:sse:raw:tail]", JSON.stringify(buffer));
    const evt = parseSseChunk(buffer);
    if (evt) yield evt;
  }
}

function parseSseChunk(chunk: string): CozeStreamEvent | null {
  let eventName = "";
  const dataLines: string[] = [];
  for (const line of chunk.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    else if (line.startsWith(":")) { /* SSE 注释行 ignore */ }
  }
  const data = dataLines.join("\n");
  if (!data && !eventName) return null;
  let payload: any = data;
  try { payload = JSON.parse(data); } catch { /* 留原文 */ }

  // 扣子事件名常见: Message / Done / Error / Interrupt / [node].progress 等
  const ev = (eventName || "").toLowerCase();
  if (ev.includes("error") || payload?.error_code) {
    return { type: "error", code: payload?.error_code, message: payload?.error_message || data, raw: payload };
  }
  if (ev === "done" || ev.includes("done") || ev.includes("workflow.completed")) {
    return { type: "done", output: payload?.output ?? payload?.data ?? payload, raw: payload };
  }
  if (ev === "interrupt" || ev.includes("interrupt")) {
    return { type: "interrupt", raw: payload };
  }
  // 扣子工作流 stream_run 主要事件名 "Message", 里面带 content (一段文本增量)
  if (ev === "message" || ev.includes("message") || payload?.content != null) {
    const text = typeof payload?.content === "string"
      ? payload.content
      : (typeof payload === "string" ? payload : (payload?.text ?? ""));
    // 扣子按文本分块推, 这里都当 delta 处理 (前端拼起来)
    return { type: "delta", text, raw: payload };
  }
  if (ev.includes("node")) {
    return { type: "node", nodeId: payload?.node_id, nodeName: payload?.node_name, raw: payload };
  }
  return { type: "other", event: eventName || "unknown", raw: payload };
}

// ===== Mock 模式 (无 token 时本地伪造响应) =====
function mockResult(input: WorkflowRunInput, _stream: boolean): WorkflowRunResult {
  const userMsg = input.parameters?.user_message || "(无输入)";
  return {
    data: { answer: `[MOCK 回复] 我看到你说: "${userMsg}". (设置 COZE_API_TOKEN 即可走真扣子)` },
    raw: { mocked: true }
  };
}

async function* mockStream(input: WorkflowRunInput): AsyncGenerator<CozeStreamEvent> {
  const userMsg = input.parameters?.user_message || "(无输入)";
  const reply = `[MOCK 流式回复] 你问了"${userMsg}"。设置 COZE_API_TOKEN + COZE_WORKFLOW_AI_TUTOR 即可走真扣子。`;
  for (const ch of reply) {
    await new Promise(r => setTimeout(r, 20));
    yield { type: "delta", text: ch };
  }
  yield { type: "done", output: { answer: reply } };
}
