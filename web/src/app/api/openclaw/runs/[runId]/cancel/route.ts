/**
 * PROVISIONAL: Cancel is via WebSocket/CLI for this OpenClaw instance.
 * This route uses guessed HTTP paths.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth-server";
import { OpenClawError, cancelRun } from "@/lib/openclaw/client";

export const runtime = "nodejs";

type Params = { runId: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const resolved = await params;
    const runId =
      typeof resolved?.runId === "string" ? resolved.runId.trim() : "";
    if (!runId) {
      return NextResponse.json(
        { success: false, message: "Missing runId." },
        { status: 400 },
      );
    }

    const run = await prisma.run.findFirst({
      where: {
        userId,
        OR: [{ id: runId }, { openclawRunId: runId }],
      },
    });
    if (!run) {
      return NextResponse.json(
        { success: false, message: "Run not found." },
        { status: 404 },
      );
    }

    const result = run.openclawRunId
      ? await cancelRun(run.openclawRunId)
      : { runId: run.id, status: "cancelled", message: undefined, raw: undefined };

    const status = result.status ?? "cancelled";
    await prisma.run.updateMany({
      where: { id: run.id, userId },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      runId: result.runId ?? run.id,
      status: result.status,
      message: result.message ?? "Run cancelled.",
      raw: result.raw,
    });
  } catch (err) {
    if (err instanceof OpenClawError && err.code === "BAD_REQUEST") {
      return NextResponse.json(
        { success: false, message: err.message, code: err.code },
        { status: 400 },
      );
    }

    if (err instanceof OpenClawError) {
      const httpStatus = err.code === "TIMEOUT" ? 504 : 502;
      return NextResponse.json(
        {
          success: false,
          message: err.message,
          code: err.code,
          upstreamStatus: err.status,
        },
        { status: httpStatus },
      );
    }

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}
