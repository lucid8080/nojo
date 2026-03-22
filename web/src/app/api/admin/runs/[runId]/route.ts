import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

type Params = { runId: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { runId: raw } = await params;
    const runId = raw?.trim();
    if (!runId) {
      return NextResponse.json({ success: false, message: "Missing run id." }, { status: 400 });
    }

    const run = await prisma.run.findFirst({
      where: {
        OR: [{ id: runId }, { openclawRunId: runId }],
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!run) {
      return NextResponse.json({ success: false, message: "Run not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        run: {
          ...run,
          createdAt: run.createdAt.toISOString(),
          updatedAt: run.updatedAt.toISOString(),
          lastCheckedAt: run.lastCheckedAt?.toISOString() ?? null,
        },
        user: run.user,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
