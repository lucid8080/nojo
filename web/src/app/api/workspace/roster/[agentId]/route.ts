import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import type { NojoAgentIdentityOverride } from "@/lib/nojo/agentIdentityOverrides";
import {
  isUserCreatedWorkspaceAgentId,
  rowToTeamWorkspaceEntry,
} from "@/lib/workspace/userWorkspaceAgentServer";

export const runtime = "nodejs";

function isPartialIdentity(v: unknown): v is Partial<NojoAgentIdentityOverride> {
  if (v === undefined || v === null) return false;
  if (typeof v !== "object") return false;
  return true;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ agentId: string }> },
) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const { agentId: rawAgentId } = await ctx.params;
    const agentId = typeof rawAgentId === "string" ? decodeURIComponent(rawAgentId).trim() : "";
    if (!agentId || !isUserCreatedWorkspaceAgentId(agentId)) {
      return NextResponse.json(
        { success: false, message: "Invalid agent id." },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    if (body === null || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Invalid body." }, { status: 400 });
    }
    const o = body as Record<string, unknown>;

    const existing = await prisma.userWorkspaceAgent.findUnique({
      where: {
        userId_agentId: { userId, agentId },
      },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Agent not found." }, { status: 404 });
    }

    const data: Prisma.UserWorkspaceAgentUpdateInput = {};
    if (typeof o.name === "string") data.name = o.name;
    if (typeof o.initials === "string") data.initials = o.initials;
    if (typeof o.role === "string") data.role = o.role;
    if (typeof o.avatarClass === "string") data.avatarClass = o.avatarClass;
    if (o.categoryLabel === undefined) {
      // omit
    } else if (o.categoryLabel === null || typeof o.categoryLabel === "string") {
      data.categoryLabel = o.categoryLabel;
    }

    if (o.identity !== undefined) {
      if (o.identity === null) {
        data.identityJson = Prisma.JsonNull;
      } else if (isPartialIdentity(o.identity)) {
        const prev =
          existing.identityJson &&
          typeof existing.identityJson === "object" &&
          existing.identityJson !== null
            ? (existing.identityJson as Record<string, unknown>)
            : {};
        data.identityJson = {
          ...prev,
          ...(o.identity as object),
        } as Prisma.InputJsonValue;
      } else {
        return NextResponse.json(
          { success: false, message: "Invalid identity." },
          { status: 400 },
        );
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({
        success: true,
        agent: rowToTeamWorkspaceEntry(existing),
      });
    }

    const row = await prisma.userWorkspaceAgent.update({
      where: { userId_agentId: { userId, agentId } },
      data,
    });

    return NextResponse.json({ success: true, agent: rowToTeamWorkspaceEntry(row) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update agent.";
    console.error("[workspace/roster/[agentId]][PATCH]", e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ agentId: string }> },
) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const { agentId: rawAgentId } = await ctx.params;
    const agentId = typeof rawAgentId === "string" ? decodeURIComponent(rawAgentId).trim() : "";
    if (!agentId || !isUserCreatedWorkspaceAgentId(agentId)) {
      return NextResponse.json(
        { success: false, message: "Invalid agent id." },
        { status: 400 },
      );
    }

    await prisma.userWorkspaceAgent.delete({
      where: { userId_agentId: { userId, agentId } },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete agent.";
    console.error("[workspace/roster/[agentId]][DELETE]", e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
