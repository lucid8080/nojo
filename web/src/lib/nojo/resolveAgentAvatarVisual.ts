import type { TeamWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import type { NojoAgentIdentityOverride } from "@/lib/nojo/agentIdentityOverrides";
import {
  getAgentAvatarFallbackClassFromAgent,
  getAgentAvatarFrameClassFromAgent,
  isCategoryColorName,
  type CategoryColorName,
} from "@/lib/categoryColors";

export type ResolvedAgentAvatarVisual =
  | {
      kind: "palette";
      categoryLabel: string;
      avatarAccent: CategoryColorName | undefined;
      frameClass: string;
      fallbackClass: string;
    }
  | { kind: "hash" };

/**
 * Canonical avatar ring/initials colors: explicit `avatarAccent` from identity overrides,
 * else category from merged roster/override, else signal to use hash fallback (no roster/override).
 */
export function resolveAgentAvatarVisualForAgent(
  mergedRosterEntry: TeamWorkspaceRosterEntry | undefined,
  override: NojoAgentIdentityOverride | undefined,
): ResolvedAgentAvatarVisual {
  if (!mergedRosterEntry && !override) {
    return { kind: "hash" };
  }

  const categoryLabel =
    (override?.categoryLabel !== undefined
      ? override.categoryLabel
      : mergedRosterEntry?.categoryLabel
    )?.trim() || "SPECIALIZED";

  const avatarAccent =
    override?.avatarAccent && isCategoryColorName(override.avatarAccent)
      ? override.avatarAccent
      : undefined;

  const agent = { categoryLabel, avatarAccent };
  return {
    kind: "palette",
    categoryLabel,
    avatarAccent,
    frameClass: getAgentAvatarFrameClassFromAgent(agent),
    fallbackClass: getAgentAvatarFallbackClassFromAgent(agent),
  };
}
