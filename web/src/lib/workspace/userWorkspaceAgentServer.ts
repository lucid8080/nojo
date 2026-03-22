import type { NojoAgentIdentityOverride } from "@/lib/nojo/agentIdentityOverrides";
import type { TeamWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import type { UserWorkspaceAgent as UserWorkspaceAgentRow } from "@prisma/client";

/** Server-side: custom user agent ids use this prefix (matches `teamWorkspaceStore`). */
export function isUserCreatedWorkspaceAgentId(agentId: string): boolean {
  return agentId.trim().startsWith("nojo-team-");
}

export function rowToTeamWorkspaceEntry(
  row: UserWorkspaceAgentRow,
): TeamWorkspaceRosterEntry {
  return {
    id: row.agentId,
    name: row.name,
    initials: row.initials,
    role: row.role,
    avatarClass: row.avatarClass,
    categoryLabel: row.categoryLabel ?? undefined,
  };
}

export function identityJsonFromRow(
  row: UserWorkspaceAgentRow,
): NojoAgentIdentityOverride | undefined {
  const raw = row.identityJson;
  if (raw === null || typeof raw !== "object") return undefined;
  return raw as NojoAgentIdentityOverride;
}
