import type { TeamWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import type { TeamAgent } from "@/data/teamPageMock";
import { defaultAvatarFilename, normalizeAgentKey } from "@/lib/agentAvatars";
import { isCategoryColorName } from "@/lib/categoryColors";
import type {
  NojoAgentIdentityOverride,
  NojoAgentIdentityOverrideMap,
} from "@/lib/nojo/agentIdentityOverrides";
import {
  mergeWorkspaceRosterEntry,
  resolveAgentAvatarFile,
} from "@/lib/nojo/agentIdentityOverrides";
import { skillNamesFromIds } from "@/lib/nojo/skillCatalog";

function fallbackInitials(id: string): string {
  const tail = id.replace(/^nojo-/, "");
  if (tail.length >= 2) return tail.slice(0, 2).toUpperCase();
  return tail.toUpperCase().padEnd(2, "?");
}

export type WorkspaceAgentToTeamOptions = {
  override?: NojoAgentIdentityOverride | null;
  /**
   * When true, avatar is derived only from the passed override (if any) or the
   * hash default — no localStorage. Matches SSR for hydration.
   */
  skipStoredAvatars?: boolean;
};

export function workspaceAgentToTeamAgent(
  w: TeamWorkspaceRosterEntry,
  options?: WorkspaceAgentToTeamOptions,
): TeamAgent {
  const merged = mergeWorkspaceRosterEntry(w, options?.override);
  const rawNameEmpty = !merged.name.trim();
  const rawRoleEmpty = !merged.role.trim();
  const trimmedName = merged.name.trim();
  const trimmedRole = merged.role.trim();
  const o = options?.override;

  const defaultDescription =
    trimmedRole || trimmedName || "No description yet.";
  const defaultObjective =
    trimmedRole || "Workspace roster member — add role in nojoWorkspaceRoster.";

  const description =
    o?.description !== undefined ? o.description : defaultDescription;
  const objective = o?.objective !== undefined ? o.objective : defaultObjective;
  const defaultAvatar = defaultAvatarFilename(merged.id);
  const avatarFile =
    options?.skipStoredAvatars
      ? o?.avatarFile !== undefined && o.avatarFile !== ""
        ? o.avatarFile
        : defaultAvatar
      : resolveAgentAvatarFile(merged.id, defaultAvatar);

  const avatarAccent =
    o?.avatarAccent && isCategoryColorName(o.avatarAccent)
      ? o.avatarAccent
      : undefined;

  const assignedIds = o?.assignedSkillIds;
  const assignedNames = skillNamesFromIds(assignedIds);

  return {
    id: merged.id,
    name: rawNameEmpty ? "Unnamed agent" : trimmedName,
    categoryLabel: merged.categoryLabel?.trim() || "SPECIALIZED",
    role: rawRoleEmpty ? "Role not set" : trimmedRole,
    status: "active",
    description,
    skillTags: assignedNames.slice(0, 6),
    currentTask: null,
    performanceLabel: "Workspace agent",
    initials: merged.initials.trim() || fallbackInitials(merged.id),
    avatarFile,
    objective,
    tools: [],
    installedSkills: assignedNames,
    taskQueue: [],
    performanceStats: [],
    rosterFieldsMissing:
      rawNameEmpty || rawRoleEmpty
        ? {
            ...(rawNameEmpty ? { name: true as const } : {}),
            ...(rawRoleEmpty ? { role: true as const } : {}),
          }
        : undefined,
    ...(o?.emoji !== undefined && o.emoji !== "" ? { emoji: o.emoji } : {}),
    ...(o?.vibe !== undefined && o.vibe !== "" ? { vibe: o.vibe } : {}),
    ...(avatarAccent ? { avatarAccent } : {}),
    ...(assignedIds?.length ? { assignedSkillIds: assignedIds } : {}),
  };
}

export function workspaceRosterToTeamAgents(
  roster: readonly TeamWorkspaceRosterEntry[],
  overrides?: NojoAgentIdentityOverrideMap | null,
  opts?: { skipStoredAvatars?: boolean },
): TeamAgent[] {
  return roster.map((entry) =>
    workspaceAgentToTeamAgent(entry, {
      override: overrides?.[normalizeAgentKey(entry.id)],
      skipStoredAvatars: opts?.skipStoredAvatars,
    }),
  );
}
