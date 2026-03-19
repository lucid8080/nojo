/**
 * PROVISIONAL: Logs are via WebSocket/CLI for this OpenClaw instance.
 * This route uses guessed HTTP paths.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth-server";
import { OpenClawError, getRunLogs } from "@/lib/openclaw/client";

export const runtime = "nodejs";

type Params = { runId: string };

export async function GET(
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
      ? await getRunLogs(run.openclawRunId)
      : { runId: run.id, logs: [], message: undefined, raw: undefined };

    return NextResponse.json({
      success: true,
      runId: result.runId ?? run.id,
      logs: result.logs,
      message: result.message ?? "OK",
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
