import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

type Params = { agentId: string };

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { agentId: rawId } = await params;
    const agentId = rawId?.trim();
    if (!agentId) {
      return NextResponse.json({ success: false, message: "Missing agent id." }, { status: 400 });
    }

    const agent = await prisma.userWorkspaceAgent.findFirst({
      where: {
        OR: [{ agentId }, { id: agentId }],
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!agent) {
      return NextResponse.json({ success: false, message: "Agent not found." }, { status: 404 });
    }

    const [convs, runs, runCount] = await Promise.all([
      prisma.workspaceConversation.findMany({
        where: { userId: agent.userId },
        select: { id: true, title: true, agentIds: true, createdAt: true, userId: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.run.findMany({
        where: { agentId: agent.agentId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.run.count({ where: { agentId: agent.agentId } }),
    ]);

    const conversationCount = countConversationsForAgent(agent.agentId, agent.userId, convs);

    return NextResponse.json({
      success: true,
      data: {
        agent: {
          ...agent,
          createdAt: agent.createdAt.toISOString(),
          updatedAt: agent.updatedAt.toISOString(),
        },
        owner: agent.user,
        conversationCount,
        runCount,
        conversations: convs.filter((c) => {
          const ids = c.agentIds;
          return Array.isArray(ids) && ids.includes(agent.agentId);
        }),
        runs: runs.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          lastCheckedAt: r.lastCheckedAt?.toISOString() ?? null,
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
