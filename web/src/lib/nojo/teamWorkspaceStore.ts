/**
 * User-created agents (browser-local). Canonical seed remains in nojoWorkspaceRoster.ts.
 */

import type {
  NojoWorkspaceRosterEntry,
  TeamWorkspaceRosterEntry,
} from "@/data/nojoWorkspaceRoster";

export const NOJO_TEAM_WORKSPACE_STORAGE_KEY = "nojoCustomTeamRosterV1";
export const NOJO_TEAM_WORKSPACE_CHANGED = "nojo-team-workspace-changed";

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

export function readCustomRoster(): TeamWorkspaceRosterEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOJO_TEAM_WORKSPACE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRosterRow);
  } catch {
    return [];
  }
}

function writeCustomRoster(agents: TeamWorkspaceRosterEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    NOJO_TEAM_WORKSPACE_STORAGE_KEY,
    JSON.stringify(agents),
  );
  window.dispatchEvent(new CustomEvent(NOJO_TEAM_WORKSPACE_CHANGED));
}

export function generateTeamAgentId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `nojo-team-${crypto.randomUUID()}`;
  }
  return `nojo-team-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function appendCustomAgent(entry: TeamWorkspaceRosterEntry): TeamWorkspaceRosterEntry[] {
  const next = [...readCustomRoster(), entry];
  writeCustomRoster(next);
  return next;
}

export function updateCustomAgent(
  id: string,
  patch: Partial<Omit<TeamWorkspaceRosterEntry, "id">>,
): TeamWorkspaceRosterEntry[] | null {
  const list = readCustomRoster();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const prev = list[idx]!;
  const nextEntry: TeamWorkspaceRosterEntry = {
    ...prev,
    ...patch,
    id: prev.id,
  };
  const next = [...list.slice(0, idx), nextEntry, ...list.slice(idx + 1)];
  writeCustomRoster(next);
  return next;
}

export function removeCustomAgent(id: string): TeamWorkspaceRosterEntry[] {
  const next = readCustomRoster().filter((a) => a.id !== id);
  writeCustomRoster(next);
  return next;
}

export function isCustomTeamAgentId(id: string): boolean {
  return id.startsWith("nojo-team-");
}

/** Merge git-tracked seed with user-created roster. When `includeCustom` is false, matches SSR (no custom rows). */
export function mergeSeedWithCustomRoster(
  seed: readonly NojoWorkspaceRosterEntry[],
  includeCustom: boolean,
): TeamWorkspaceRosterEntry[] {
  if (!includeCustom) return [...seed];
  return [...seed, ...readCustomRoster()];
}

/** Merge seed with an explicit custom list (e.g. server roster + browser cache). */
export function mergeSeedWithCustomRosterEntries(
  seed: readonly NojoWorkspaceRosterEntry[],
  custom: readonly TeamWorkspaceRosterEntry[],
): TeamWorkspaceRosterEntry[] {
  return [...seed, ...custom];
}

/** Replace browser-only roster cache (used after successful server sync). */
export function setBrowserCustomRoster(agents: TeamWorkspaceRosterEntry[]): void {
  writeCustomRoster(agents);
}
