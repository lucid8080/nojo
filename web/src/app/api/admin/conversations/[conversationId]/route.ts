import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

type Params = { conversationId: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { conversationId } = await params;
    if (!conversationId?.trim()) {
      return NextResponse.json(
        { success: false, message: "Missing conversation id." },
        { status: 400 },
      );
    }

    const conv = await prisma.workspaceConversation.findUnique({
      where: { id: conversationId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!conv) {
      return NextResponse.json(
        { success: false, message: "Conversation not found." },
        { status: 404 },
      );
    }

    const runs = await prisma.run.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    return NextResponse.json({
      success: true,
      data: {
        conversation: {
          ...conv,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString(),
        },
        owner: conv.user,
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
