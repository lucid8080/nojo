import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

type Params = { userId: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { userId } = await params;
    if (!userId?.trim()) {
      return NextResponse.json({ success: false, message: "Missing userId." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaceAgents: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        workspaceConversations: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        runs: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        agents: user.workspaceAgents.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        })),
        conversations: user.workspaceConversations.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
        runs: user.runs.map((r) => ({
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
