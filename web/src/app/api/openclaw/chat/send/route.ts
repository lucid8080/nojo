import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { OpenClawError } from "@/lib/openclaw/client";
import { getOpenClawRoomBridge } from "@/lib/openclaw/openclaw-chat-bridge";

export const runtime = "nodejs";

type Body = {
  prompt?: unknown;
  conversationId?: unknown;
  agentId?: unknown;
  idempotencyKey?: unknown;
};

function randomIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `nojo_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to chat." },
        { status: 401 },
      );
    }

    const body = (await req.json()) as Body;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ success: false, message: "Missing prompt." }, { status: 400 });
    }
    if (prompt.length > 20000) {
      return NextResponse.json({ success: false, message: "prompt is too long." }, { status: 400 });
    }

    const conversationId =
      typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    if (!conversationId) {
      return NextResponse.json(
        { success: false, message: "Missing conversationId." },
        { status: 400 },
      );
    }

    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : undefined;
    const idempotencyKey =
      typeof body.idempotencyKey === "string" && body.idempotencyKey.trim() !== ""
        ? body.idempotencyKey.trim()
        : randomIdempotencyKey();

    const bridge = getOpenClawRoomBridge({ userId, conversationId, agentId });
    await bridge.sendUserMessage(prompt, idempotencyKey);

    return NextResponse.json({
      success: true,
      sessionKey: bridge.sessionKey,
      idempotencyKey,
    });
  } catch (err) {
    if (err instanceof OpenClawError && err.code === "CONFIG") {
      return NextResponse.json(
        { success: false, message: err.message, code: err.code },
        { status: 500 },
      );
    }

    if (err instanceof OpenClawError) {
      const httpStatus = err.code === "TIMEOUT" ? 504 : 502;
      return NextResponse.json(
        {
          success: false,
          message: err.message,
          code: err.code,
        },
        { status: httpStatus },
      );
    }

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
