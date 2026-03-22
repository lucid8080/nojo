"use client";

import { useWorkspaceRosterFromContext } from "@/components/providers/WorkspaceRosterProvider";
import type { NojoWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import type { TeamAgent } from "@/data/teamPageMock";
import {
  NOJO_AGENT_IDENTITY_CHANGED,
  NOJO_AGENT_IDENTITY_STORAGE_KEY,
  readOverrides,
} from "@/lib/nojo/agentIdentityOverrides";
import {
  mergeSeedWithCustomRosterEntries,
  NOJO_TEAM_WORKSPACE_CHANGED,
  NOJO_TEAM_WORKSPACE_STORAGE_KEY,
  readCustomRoster,
} from "@/lib/nojo/teamWorkspaceStore";
import { useHasMounted } from "@/lib/hooks/useHasMounted";
import { workspaceRosterToTeamAgents } from "@/lib/nojo/workspaceAgentToTeamAgent";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Team agents merged with persisted custom roster (API) and local identity overrides.
 */
export function useHydratedTeamAgents(
  baseRoster: readonly NojoWorkspaceRosterEntry[],
): TeamAgent[] {
  const { customAgents, loading } = useWorkspaceRosterFromContext();
  const hasMounted = useHasMounted();
  /** 0 = match SSR (no overlays). 1+ = merged client state. */
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    bump();
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
    const roster = mergeSeedWithCustomRosterEntries(baseRoster, effectiveCustom);
    return workspaceRosterToTeamAgents(
      roster,
      version === 0 ? null : readOverrides(),
      { skipStoredAvatars: version === 0 },
    );
  }, [baseRoster, version, effectiveCustom]);
}
