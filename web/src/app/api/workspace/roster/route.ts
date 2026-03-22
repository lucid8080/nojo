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

function isIdentityOverride(v: unknown): v is NojoAgentIdentityOverride {
  if (v === undefined || v === null) return true;
  if (typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o);
  const allowed = new Set([
    "name",
    "role",
    "initials",
    "categoryLabel",
    "description",
    "objective",
    "vibe",
    "emoji",
    "avatarFile",
    "avatarAccent",
    "assignedSkillIds",
  ]);
  return keys.every((k) => allowed.has(k));
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to load your agent roster." },
        { status: 401 },
      );
    }

    const rows = await prisma.userWorkspaceAgent.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    const agents = rows.map(rowToTeamWorkspaceEntry);
    return NextResponse.json({ success: true, agents });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load roster.";
    console.error("[workspace/roster][GET]", e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to create an agent." },
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
    const o = body as Record<string, unknown>;

    const agentId = typeof o.agentId === "string" ? o.agentId.trim() : "";
    if (!agentId || !isUserCreatedWorkspaceAgentId(agentId)) {
      return NextResponse.json(
        {
          success: false,
          message: "agentId must be a user-created id (e.g. nojo-team-…).",
        },
        { status: 400 },
      );
    }

    const rosterCandidate = {
      id: agentId,
      name: o.name,
      initials: o.initials,
      role: o.role,
      avatarClass: o.avatarClass,
      categoryLabel: o.categoryLabel,
    };
    if (!isRosterRow(rosterCandidate)) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid roster fields." },
        { status: 400 },
      );
    }

    let identityJson: NojoAgentIdentityOverride | undefined;
    if (o.identity !== undefined) {
      if (!isIdentityOverride(o.identity)) {
        return NextResponse.json(
          { success: false, message: "Invalid identity object." },
          { status: 400 },
        );
      }
      identityJson = o.identity as NojoAgentIdentityOverride;
    }

    const row = await prisma.userWorkspaceAgent.upsert({
      where: {
        userId_agentId: { userId, agentId },
      },
      create: {
        userId,
        agentId,
        name: rosterCandidate.name,
        initials: rosterCandidate.initials,
        role: rosterCandidate.role,
        avatarClass: rosterCandidate.avatarClass,
        categoryLabel: rosterCandidate.categoryLabel ?? null,
        identityJson: identityJson ?? undefined,
      },
      update: {
        name: rosterCandidate.name,
        initials: rosterCandidate.initials,
        role: rosterCandidate.role,
        avatarClass: rosterCandidate.avatarClass,
        categoryLabel: rosterCandidate.categoryLabel ?? null,
        ...(identityJson !== undefined ? { identityJson } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      agent: rowToTeamWorkspaceEntry(row),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save agent.";
    console.error("[workspace/roster][POST]", e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
