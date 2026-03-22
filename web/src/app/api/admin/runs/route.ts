import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import type { AdminRunListRow } from "@/types/admin";

export const runtime = "nodejs";

function preview(text: string, max = 200): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;

    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q } },
              { openclawRunId: { contains: q } },
              { prompt: { contains: q } },
              { user: { email: { contains: q } } },
            ],
          }
        : {}),
    };

    const [total, runs] = await Promise.all([
      prisma.run.count({ where }),
      prisma.run.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, email: true } },
        },
      }),
    ]);

    const rows: AdminRunListRow[] = runs.map((r) => ({
      id: r.id,
      openclawRunId: r.openclawRunId,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      lastCheckedAt: r.lastCheckedAt?.toISOString() ?? null,
      promptPreview: preview(r.prompt),
      errorPreview: r.errorMessage ? preview(r.errorMessage, 300) : null,
      user: r.user,
      agentId: r.agentId,
      conversationId: r.conversationId,
    }));

    return NextResponse.json({
      success: true,
      data: {
        rows,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
