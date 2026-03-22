"use client";

import { useWorkspaceRosterFromContext } from "@/components/providers/WorkspaceRosterProvider";
import type { NojoWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import { NOJO_WORKSPACE_AGENTS } from "@/data/nojoWorkspaceRoster";
import { normalizeAgentKey } from "@/lib/agentAvatars";
import {
  NOJO_AGENT_IDENTITY_CHANGED,
  NOJO_AGENT_IDENTITY_STORAGE_KEY,
  mergeWorkspaceRosterList,
  readOverrides,
} from "@/lib/nojo/agentIdentityOverrides";
import {
  mergeSeedWithCustomRosterEntries,
  NOJO_TEAM_WORKSPACE_CHANGED,
  NOJO_TEAM_WORKSPACE_STORAGE_KEY,
  readCustomRoster,
} from "@/lib/nojo/teamWorkspaceStore";
import { useHasMounted } from "@/lib/hooks/useHasMounted";
import {
  resolveAgentAvatarVisualForAgent,
  type ResolvedAgentAvatarVisual,
} from "@/lib/nojo/resolveAgentAvatarVisual";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Resolves the same avatar frame/fallback as Team page / View details for a roster id.
 * Re-reads when identity or team roster storage changes (mirrors `useHydratedTeamAgents`).
 */
export function useResolvedAgentAccent(
  agentId: string | undefined,
  baseRoster: readonly NojoWorkspaceRosterEntry[] = NOJO_WORKSPACE_AGENTS,
): ResolvedAgentAvatarVisual {
  const { customAgents, loading } = useWorkspaceRosterFromContext();
  const hasMounted = useHasMounted();
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    queueMicrotask(() => bump());
  }, [bump]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (
        e.key === NOJO_AGENT_IDENTITY_STORAGE_KEY ||
        e.key === NOJO_TEAM_WORKSPACE_STORAGE_KEY ||
        e.key === "agentAvatarMapV1"
      ) {
        bump();
      }
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(NOJO_AGENT_IDENTITY_CHANGED, bump);
    window.addEventListener(NOJO_TEAM_WORKSPACE_CHANGED, bump);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(NOJO_AGENT_IDENTITY_CHANGED, bump);
      window.removeEventListener(NOJO_TEAM_WORKSPACE_CHANGED, bump);
    };
  }, [bump]);

  const effectiveCustom = useMemo(() => {
    if (!hasMounted) return [];
    if (customAgents.length > 0) return customAgents;
    if (loading) return readCustomRoster();
    return [];
  }, [hasMounted, customAgents, loading]);

  return useMemo(() => {
    if (!agentId?.trim()) {
      return { kind: "hash" as const };
    }
    const roster = mergeSeedWithCustomRosterEntries(baseRoster, effectiveCustom);
    const overrides = version === 0 ? null : readOverrides();
    const list = mergeWorkspaceRosterList(roster, overrides);
    const key = normalizeAgentKey(agentId);
    const entry = list.find((e) => normalizeAgentKey(e.id) === key);
    const o = overrides?.[key];
    return resolveAgentAvatarVisualForAgent(entry, o);
  }, [agentId, baseRoster, version, effectiveCustom]);
}
