import type { Conversation, WorkspaceStatus } from "@/data/workspaceChatMock";
import type { TeamWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import { NOJO_WORKSPACE_AGENTS } from "@/data/nojoWorkspaceRoster";
import type { WorkspaceConversation as WorkspaceConversationRow } from "@prisma/client";

import {
  isCanonicalAgentId,
  parseAgentIdsJson,
} from "./workspaceConversationValidation";

function fallbackAgent(id: string): TeamWorkspaceRosterEntry {
  return {
    id,
    name: id,
    initials: "??",
    role: "Unknown agent",
    avatarClass: "bg-slate-500",
    categoryLabel: "UNKNOWN",
  };
}

/** Build a lookup map from built-in seed + user-created roster rows. */
export function buildWorkspaceAgentLookupMap(
  userAgents: readonly TeamWorkspaceRosterEntry[],
): Map<string, TeamWorkspaceRosterEntry> {
  const m = new Map<string, TeamWorkspaceRosterEntry>();
  for (const a of NOJO_WORKSPACE_AGENTS) {
    m.set(a.id, a);
  }
  for (const a of userAgents) {
    m.set(a.id, a);
  }
  return m;
}

export function rosterAgentFromLookup(
  id: string,
  lookup: Map<string, TeamWorkspaceRosterEntry>,
): TeamWorkspaceRosterEntry {
  const a = lookup.get(id);
  if (a) return a;
  if (isCanonicalAgentId(id)) {
    const seed = NOJO_WORKSPACE_AGENTS.find((x) => x.id === id);
    if (seed) return seed;
  }
  return fallbackAgent(id);
}

/** Short relative label for the inbox list (API-backed rooms). */
export function formatWorkspaceListTimestamp(createdAt: Date): string {
  const ms = Date.now() - createdAt.getTime();
  if (ms < 60_000) return "Just now";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function prismaRowToWorkspaceConversationDto(
  row: WorkspaceConversationRow,
  lookup: Map<string, TeamWorkspaceRosterEntry>,
): Conversation {
  const parsed = parseAgentIdsJson(row.agentIds);
  if (!parsed?.length) {
    throw new Error(`Invalid agentIds JSON for conversation ${row.id}`);
  }
  const agents = parsed.map((id) => rosterAgentFromLookup(id, lookup));
  const desc = row.description?.trim() ?? "";
  const preview =
    desc.length > 0
      ? desc.length > 96
        ? `${desc.slice(0, 93)}…`
        : desc
      : "New room — add context or send a message.";

  const createdIso = row.createdAt.toISOString();
  const status: WorkspaceStatus = "Waiting for Reply";

  return {
    id: row.id,
    jobTitle: row.title,
    description: desc || undefined,
    createdAt: createdIso,
    agents,
    primaryAgentId: row.primaryAgentId,
    status,
    lastPreview: preview,
    unreadCount: 0,
    timestamp: formatWorkspaceListTimestamp(row.createdAt),
    archived: false,
  };
}
