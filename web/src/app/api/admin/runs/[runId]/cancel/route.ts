/**
 * Admin: cancel any run (no user scoping).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { OpenClawError, cancelRun } from "@/lib/openclaw/client";

export const runtime = "nodejs";

type Params = { runId: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { runId: raw } = await params;
    const runId = raw?.trim();
    if (!runId) {
      return NextResponse.json({ success: false, message: "Missing runId." }, { status: 400 });
    }

    const run = await prisma.run.findFirst({
      where: {
        OR: [{ id: runId }, { openclawRunId: runId }],
      },
    });
    if (!run) {
      return NextResponse.json({ success: false, message: "Run not found." }, { status: 404 });
    }

    const result = run.openclawRunId
      ? await cancelRun(run.openclawRunId)
      : { runId: run.id, status: "cancelled", message: undefined, raw: undefined };

    const status = result.status ?? "cancelled";
    await prisma.run.updateMany({
      where: { id: run.id },
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
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
