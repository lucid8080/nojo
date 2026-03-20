import { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { getOpenClawRoomBridge, type OpenClawChatBridgeEvent } from "@/lib/openclaw/openclaw-chat-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ success: false, message: "Unauthorized." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const conversationId = req.nextUrl.searchParams.get("conversationId")?.trim() ?? "";
  if (!conversationId) {
    return new Response(JSON.stringify({ success: false, message: "conversationId is required." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const agentId = req.nextUrl.searchParams.get("agentId")?.trim() || undefined;

  const bridge = getOpenClawRoomBridge({ userId, conversationId, agentId });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (ev: OpenClawChatBridgeEvent) => {
        try {
          controller.enqueue(encoder.encode(sseLine("openclaw", ev)));
        } catch {
          // closed
        }
      };

      unsubscribe = bridge.subscribe(push);

      const onAbort = () => {
        try {
          unsubscribe?.();
        } finally {
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      req.signal.addEventListener("abort", onAbort);
    },
    cancel() {
      try {
        unsubscribe?.();
      } finally {
        unsubscribe = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
