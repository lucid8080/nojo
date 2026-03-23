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
  validateCreateWorkspaceConversationBodyAsync,
} from "@/lib/workspace/workspaceConversationValidation";
import { requireProjectOwnedByUser } from "@/lib/files/nojoFileAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to load workspace rooms." },
        { status: 401 },
      );
    }

    const rows = await prisma.workspaceConversation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const allIds = new Set<string>();
    for (const r of rows) {
      const ids = parseAgentIdsJson(r.agentIds) ?? [];
      for (const id of ids) allIds.add(id);
    }
    const nonCanonical = [...allIds].filter((id) => !isCanonicalAgentId(id));
    const userAgentRows =
      nonCanonical.length > 0
        ? await prisma.userWorkspaceAgent.findMany({
            where: { userId, agentId: { in: nonCanonical } },
          })
        : [];
    const lookup = buildWorkspaceAgentLookupMap(userAgentRows.map(rowToTeamWorkspaceEntry));

    const conversations = rows.map((r) => prismaRowToWorkspaceConversationDto(r, lookup));

    return NextResponse.json({ success: true, conversations });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load conversations.";
    console.error("[workspace/conversations][GET]", e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to create a room." },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    const validation = await validateCreateWorkspaceConversationBodyAsync(userId, body);
    if (!validation.ok) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const { title, description, agentIds, primaryAgentId, projectId } = validation.value;

    // Optional: validate project ownership before linking the conversation to it.
    // We cannot rely on client-supplied IDs for authorization.
    const projectIdValidated =
      typeof projectId === "string" && projectId.trim().length > 0 ? projectId.trim() : null;
    if (projectIdValidated) {
      await requireProjectOwnedByUser({ userId, projectId: projectIdValidated });
    }

    const row = await prisma.workspaceConversation.create({
      data: {
        userId,
        title,
        description,
        agentIds,
        primaryAgentId,
        projectId: projectIdValidated,
      },
    });

    const nonCanonical = agentIds.filter((id) => !isCanonicalAgentId(id));
    const userAgentRows =
      nonCanonical.length > 0
        ? await prisma.userWorkspaceAgent.findMany({
            where: { userId, agentId: { in: nonCanonical } },
          })
        : [];
    const lookup = buildWorkspaceAgentLookupMap(userAgentRows.map(rowToTeamWorkspaceEntry));
    const conversation = prismaRowToWorkspaceConversationDto(row, lookup);

    return NextResponse.json({ success: true, conversation });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create conversation.";
    console.error("[workspace/conversations][POST]", e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
