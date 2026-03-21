"use client";

import type { NojoWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import type { TeamAgent } from "@/data/teamPageMock";
import {
  NOJO_AGENT_IDENTITY_CHANGED,
  NOJO_AGENT_IDENTITY_STORAGE_KEY,
  readOverrides,
} from "@/lib/nojo/agentIdentityOverrides";
import {
  mergeSeedWithCustomRoster,
  NOJO_TEAM_WORKSPACE_CHANGED,
  NOJO_TEAM_WORKSPACE_STORAGE_KEY,
} from "@/lib/nojo/teamWorkspaceStore";
import { workspaceRosterToTeamAgents } from "@/lib/nojo/workspaceAgentToTeamAgent";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Team agents merged with local identity overrides. Re-reads after mount (client storage)
 * and on cross-tab storage / identity events.
 */
export function useHydratedTeamAgents(
  baseRoster: readonly NojoWorkspaceRosterEntry[],
): TeamAgent[] {
  /** 0 = match SSR (no localStorage in roster). 1+ = merged client state. */
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

  return useMemo(() => {
    const roster = mergeSeedWithCustomRoster(baseRoster, version > 0);
    return workspaceRosterToTeamAgents(
      roster,
      version === 0 ? null : readOverrides(),
      { skipStoredAvatars: version === 0 },
    );
  }, [baseRoster, version]);
}
