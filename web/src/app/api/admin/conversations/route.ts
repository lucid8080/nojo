import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import type { AdminConversationListRow } from "@/types/admin";

export const runtime = "nodejs";

function agentIdsLength(agentIds: unknown): number {
  return Array.isArray(agentIds) ? agentIds.length : 0;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const skip = (page - 1) * pageSize;

    const where = {
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { user: { email: { contains: q } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.workspaceConversation.count({ where }),
      prisma.workspaceConversation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, email: true } },
        },
      }),
    ]);

    const data: AdminConversationListRow[] = rows.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      owner: { id: c.user.id, email: c.user.email },
      primaryAgentId: c.primaryAgentId,
      agentCount: agentIdsLength(c.agentIds),
    }));

    return NextResponse.json({
      success: true,
      data: {
        rows: data,
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
