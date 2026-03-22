import { NextRequest, NextResponse } from "next/server";
import type { TeamWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import { getSessionUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import type { NojoAgentIdentityOverride } from "@/lib/nojo/agentIdentityOverrides";
import {
  isUserCreatedWorkspaceAgentId,
  rowToTeamWorkspaceEntry,
} from "@/lib/workspace/userWorkspaceAgentServer";

export const runtime = "nodejs";

function isRosterRow(v: unknown): v is TeamWorkspaceRosterEntry {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.initials === "string" &&
    typeof o.role === "string" &&
    typeof o.avatarClass === "string" &&
    (o.categoryLabel === undefined || typeof o.categoryLabel === "string")
  );
}

/**
 * Batch upsert from browser localStorage migration (idempotent by agentId).
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to sync your roster." },
        { status: 401 },
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
    const entries = (body as Record<string, unknown>).entries;
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { success: false, message: "entries must be a non-empty array." },
        { status: 400 },
      );
    }

    const agents: TeamWorkspaceRosterEntry[] = [];
    const identities: (NojoAgentIdentityOverride | undefined)[] = [];

    for (const item of entries) {
      if (!item || typeof item !== "object") {
        return NextResponse.json(
          { success: false, message: "Each entry must be an object." },
          { status: 400 },
        );
      }
      const rec = item as Record<string, unknown>;
      if (!isRosterRow(rec.roster)) {
        return NextResponse.json(
          { success: false, message: "Each entry.roster must be a valid roster row." },
          { status: 400 },
        );
      }
      const r = rec.roster;
      if (!isUserCreatedWorkspaceAgentId(r.id)) {
        return NextResponse.json(
          { success: false, message: `Skipping non user agent id: ${r.id}` },
          { status: 400 },
        );
      }
      agents.push(r);
      if (rec.identity !== undefined && rec.identity !== null) {
        if (typeof rec.identity !== "object") {
          return NextResponse.json(
            { success: false, message: "entry.identity must be an object when set." },
            { status: 400 },
          );
        }
        identities.push(rec.identity as NojoAgentIdentityOverride);
      } else {
        identities.push(undefined);
      }
    }

    for (let i = 0; i < agents.length; i++) {
      const roster = agents[i]!;
      const identityJson = identities[i];
      await prisma.userWorkspaceAgent.upsert({
        where: {
          userId_agentId: { userId, agentId: roster.id },
        },
        create: {
          userId,
          agentId: roster.id,
          name: roster.name,
          initials: roster.initials,
          role: roster.role,
          avatarClass: roster.avatarClass,
          categoryLabel: roster.categoryLabel ?? null,
          identityJson: identityJson ?? undefined,
        },
        update: {
          name: roster.name,
          initials: roster.initials,
          role: roster.role,
          avatarClass: roster.avatarClass,
          categoryLabel: roster.categoryLabel ?? null,
          ...(identityJson !== undefined ? { identityJson } : {}),
        },
      });
    }

    const rows = await prisma.userWorkspaceAgent.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      agents: rows.map(rowToTeamWorkspaceEntry),
      synced: agents.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to sync roster.";
    console.error("[workspace/roster/sync][POST]", e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
