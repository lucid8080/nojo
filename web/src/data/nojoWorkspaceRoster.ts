import { CANONICAL_NOJO_AGENT_IDS } from "@/lib/nojo/agentIdentityMap";

/**
 * Roster row shape for workspace + Team (canonical seed or user-created).
 * Use `NojoWorkspaceRosterEntry` for typed canonical ids; this widens `id` for merges.
 */
export type TeamWorkspaceRosterEntry = {
  id: string;
  name: string;
  initials: string;
  role: string;
  /** Tailwind bg class fragment e.g. "bg-violet-500" */
  avatarClass: string;
  /** Team card category ring / accent (see AGENT_CATEGORY_COLORS) */
  categoryLabel?: string;
};

/**
 * Single roster row for Agent workspace + Team page.
 * Ordered by CANONICAL_NOJO_AGENT_IDS (matches runtime / OpenClaw identity).
 */
export type NojoWorkspaceRosterEntry = TeamWorkspaceRosterEntry & {
  id: (typeof CANONICAL_NOJO_AGENT_IDS)[number];
};

const ROSTER_META: Record<
  (typeof CANONICAL_NOJO_AGENT_IDS)[number],
  Omit<NojoWorkspaceRosterEntry, "id">
> = {
  "nojo-main": {
    name: "Mira Okonkwo",
    initials: "MO",
    role: "QA & Compliance",
    avatarClass: "bg-emerald-500",
    categoryLabel: "SUPPORT",
  },
  "nojo-builder": {
    name: "Ellis Rowe",
    initials: "ER",
    role: "Pipeline Engineer",
    avatarClass: "bg-amber-500",
    categoryLabel: "ENGINEERING",
  },
  "nojo-support": {
    name: "Juno Blake",
    initials: "JB",
    role: "Support Triage",
    avatarClass: "bg-rose-500",
    categoryLabel: "SUPPORT",
  },
  "nojo-sales": {
    name: "Kite Park",
    initials: "KP",
    role: "Research Analyst",
    avatarClass: "bg-sky-500",
    categoryLabel: "STRATEGY",
  },
  "nojo-content": {
    name: "Nova Chen",
    initials: "NC",
    role: "Content Strategist",
    avatarClass: "bg-violet-500",
    categoryLabel: "MARKETING",
  },
};

function initialsFromCanonicalId(
  id: (typeof CANONICAL_NOJO_AGENT_IDS)[number],
): string {
  const tail = id.replace(/^nojo-/, "");
  if (tail.length >= 2) return tail.slice(0, 2).toUpperCase();
  return tail.toUpperCase().padEnd(2, "?");
}

function buildRoster(): NojoWorkspaceRosterEntry[] {
  return CANONICAL_NOJO_AGENT_IDS.map((id) => {
    const meta = ROSTER_META[id];
    if (meta) return { id, ...meta };
    return {
      id,
      name: "",
      initials: initialsFromCanonicalId(id),
      role: "",
      avatarClass: "bg-slate-500",
    };
  });
}

/** Canonical Agent workspace roster (stable order, all runtime ids). */
export const NOJO_WORKSPACE_AGENTS: NojoWorkspaceRosterEntry[] = buildRoster();
