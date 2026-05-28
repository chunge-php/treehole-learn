/**
 * POST /api/admin/wishes/generate-stream — 流式生成月度家长信 (SSE)
 *
 *   body: { endUserId, year, month }
 *   resp: Content-Type: text/event-stream
 *         事件:
 *           event: delta   data: {"text": "..."}
 *           event: context data: {"rendered": "...", "student_name": "..."}
 *           event: done    data: {"content": "...", "mock": true, "debugUrl": "..."}
 *           event: error   data: {"error": "..."}
 *
 * 仅管理员可用 (requireAdmin 走 cookie session).
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { streamLetter } from "@/lib/wish-letter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sseLine(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  try {
    requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "无权限" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const endUserId = String(body?.endUserId || "").trim();
  const year = Number(body?.year) || new Date().getFullYear();
  const month = Number(body?.month) || (new Date().getMonth() + 1);
  if (!endUserId) {
    return NextResponse.json({ ok: false, error: "缺少 endUserId" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const evt of streamLetter({ endUserId, year, month })) {
          if (evt.type === "context") {
            controller.enqueue(encoder.encode(sseLine("context", {
              rendered: evt.context.rendered,
              student_name: evt.context.studentName
            })));
          } else if (evt.type === "delta") {
            controller.enqueue(encoder.encode(sseLine("delta", { text: evt.text })));
          } else if (evt.type === "done") {
            controller.enqueue(encoder.encode(sseLine("done", {
              content: evt.content, mock: evt.mock, debugUrl: evt.debugUrl
            })));
          } else if (evt.type === "error") {
            controller.enqueue(encoder.encode(sseLine("error", { error: evt.message })));
          }
        }
      } catch (e: any) {
        controller.enqueue(encoder.encode(sseLine("error", { error: e?.message || "stream failed" })));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
