"use client";

import type { TeamWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import { buildAgentRosterSyncPayload } from "@/lib/nojo/workspaceRosterSync";
import {
  NOJO_TEAM_WORKSPACE_CHANGED,
  NOJO_TEAM_WORKSPACE_STORAGE_KEY,
  readCustomRoster,
  setBrowserCustomRoster,
} from "@/lib/nojo/teamWorkspaceStore";
import { useCallback, useEffect, useState } from "react";

/**
 * Loads user-created agents from GET `/api/workspace/roster`, migrates browser `localStorage`
 * once via `/api/workspace/roster/sync`, and exposes merged custom rows for seed merge.
 */
export function useWorkspaceRosterCustomAgents(): {
  customAgents: TeamWorkspaceRosterEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [customAgents, setCustomAgents] = useState<TeamWorkspaceRosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/roster", { cache: "no-store" });
      if (res.status === 401) {
        setCustomAgents(readCustomRoster());
        return;
      }
      const json = (await res.json()) as {
        success?: boolean;
        agents?: TeamWorkspaceRosterEntry[];
      };

      let next: TeamWorkspaceRosterEntry[] = Array.isArray(json.agents)
        ? json.agents
        : [];

      const local = readCustomRoster();
      if (local.length > 0) {
        const syncRes = await fetch("/api/workspace/roster/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(buildAgentRosterSyncPayload()),
        });
        if (syncRes.ok) {
          const syncJson = (await syncRes.json()) as {
            agents?: TeamWorkspaceRosterEntry[];
          };
          setBrowserCustomRoster([]);
          if (Array.isArray(syncJson.agents)) {
            next = syncJson.agents;
          }
        }
      }

      setCustomAgents(next);
    } catch {
      setCustomAgents(readCustomRoster());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === NOJO_TEAM_WORKSPACE_STORAGE_KEY) {
        void refresh();
      }
    }
    function onTeamChanged() {
      void refresh();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(NOJO_TEAM_WORKSPACE_CHANGED, onTeamChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(NOJO_TEAM_WORKSPACE_CHANGED, onTeamChanged);
    };
  }, [refresh]);

  return { customAgents, loading, refresh };
}
