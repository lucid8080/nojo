import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import type { AdminAgentListRow } from "@/types/admin";

export const runtime = "nodejs";

function countConversationsForAgent(
  agentId: string,
  userId: string,
  convs: { userId: string; agentIds: unknown }[],
): number {
  return convs.filter((c) => {
    if (c.userId !== userId) return false;
    const ids = c.agentIds;
    return Array.isArray(ids) && ids.some((id) => id === agentId);
  }).length;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const ownerId = searchParams.get("owner")?.trim() ?? "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const skip = (page - 1) * pageSize;

    const where = {
      ...(ownerId ? { userId: ownerId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { agentId: { contains: q } },
              { user: { email: { contains: q } } },
            ],
          }
        : {}),
    };

    const [total, agents] = await Promise.all([
      prisma.userWorkspaceAgent.count({ where }),
      prisma.userWorkspaceAgent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, email: true } },
        },
      }),
    ]);

    const userIds = [...new Set(agents.map((a) => a.userId))];
    const agentIds = agents.map((a) => a.agentId);

    const [convs, runGroups] = await Promise.all([
      userIds.length
        ? prisma.workspaceConversation.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, agentIds: true },
          })
        : Promise.resolve([]),
      agentIds.length
        ? prisma.run.groupBy({
            by: ["agentId"],
            where: { agentId: { in: agentIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const runMap = new Map(
      runGroups.map((g) => [g.agentId as string, g._count._all]),
    );

    const rows: AdminAgentListRow[] = agents.map((a) => ({
      id: a.id,
      agentId: a.agentId,
      name: a.name,
      categoryLabel: a.categoryLabel,
      createdAt: a.createdAt.toISOString(),
      owner: { id: a.user.id, email: a.user.email },
      conversationCount: countConversationsForAgent(a.agentId, a.userId, convs),
      runCount: a.agentId ? runMap.get(a.agentId) ?? 0 : 0,
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
