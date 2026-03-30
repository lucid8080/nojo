import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import {
  buildWorkspaceAgentLookupMap,
  prismaRowToWorkspaceConversationDto,
} from "@/lib/workspace/mapWorkspaceConversationRow";
import { rowToTeamWorkspaceEntry } from "@/lib/workspace/userWorkspaceAgentServer";
import {
  isCanonicalAgentId,
  parseAgentIdsJson,
} from "@/lib/workspace/workspaceConversationValidation";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to update a room." },
        { status: 401 },
      );
    }
    
    // params is awaited from Next 15
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    const { agentIds, removeAgentIds } = body as { agentIds?: unknown; removeAgentIds?: unknown };

    if (agentIds !== undefined && (!Array.isArray(agentIds) || !agentIds.every((id) => typeof id === "string"))) {
      return NextResponse.json({ success: false, message: "agentIds must be an array of strings." }, { status: 400 });
    }
    
    if (removeAgentIds !== undefined && (!Array.isArray(removeAgentIds) || !removeAgentIds.every((id) => typeof id === "string"))) {
      return NextResponse.json({ success: false, message: "removeAgentIds must be an array of strings." }, { status: 400 });
    }

    // Ensure user owns the conversation
    const conversation = await prisma.workspaceConversation.findUnique({
      where: { id },
    });

    if (!conversation || conversation.userId !== userId) {
      return NextResponse.json({ success: false, message: "Conversation not found or access denied." }, { status: 404 });
    }
    
    // Calculate final set of agents
    let finalAgentIds = parseAgentIdsJson(conversation.agentIds) ?? [];
    
    // 1. Remove agents
    if (Array.isArray(removeAgentIds) && removeAgentIds.length > 0) {
      const removeSet = new Set(removeAgentIds);
      finalAgentIds = finalAgentIds.filter(id => !removeSet.has(id));
    }

    // 2. Add agents
    if (Array.isArray(agentIds) && agentIds.length > 0) {
      const existingSet = new Set(finalAgentIds);
      for (const aId of agentIds) {
        if (!existingSet.has(aId)) {
          existingSet.add(aId);
          finalAgentIds.push(aId);
        }
      }
    }

    if (finalAgentIds.length === 0) {
      return NextResponse.json({ success: false, message: "A conversation must have at least one agent." }, { status: 400 });
    }

    let primaryAgentId = conversation.primaryAgentId;
    if (!finalAgentIds.includes(primaryAgentId)) {
      primaryAgentId = finalAgentIds[0];
    }

    const updatedRow = await prisma.workspaceConversation.update({
      where: { id },
      data: {
        agentIds: finalAgentIds,
        primaryAgentId,
      },
    });

    const nonCanonical = finalAgentIds.filter((id) => !isCanonicalAgentId(id));
    const userAgentRows =
      nonCanonical.length > 0
        ? await prisma.userWorkspaceAgent.findMany({
            where: { userId, agentId: { in: nonCanonical } },
          })
        : [];
    const lookup = buildWorkspaceAgentLookupMap(userAgentRows.map(rowToTeamWorkspaceEntry));
    const updatedConversation = prismaRowToWorkspaceConversationDto(updatedRow, lookup);

    return NextResponse.json({ success: true, conversation: updatedConversation });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update conversation.";
    console.error("[workspace/conversations/[id]][PATCH]", e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
