"use client";

import type {
  NojoWorkspaceRosterEntry,
  TeamWorkspaceRosterEntry,
} from "@/data/nojoWorkspaceRoster";
import {
  mergeWorkspaceRosterList,
  NOJO_AGENT_IDENTITY_CHANGED,
  NOJO_AGENT_IDENTITY_STORAGE_KEY,
  readOverrides,
} from "@/lib/nojo/agentIdentityOverrides";
import {
  mergeSeedWithCustomRoster,
  NOJO_TEAM_WORKSPACE_CHANGED,
  NOJO_TEAM_WORKSPACE_STORAGE_KEY,
} from "@/lib/nojo/teamWorkspaceStore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AgentIdentityContextValue = {
  mergedRoster: TeamWorkspaceRosterEntry[];
  getAgent: (id: string) => TeamWorkspaceRosterEntry | undefined;
};

const AgentIdentityContext = createContext<AgentIdentityContextValue | null>(
  null,
);

export function AgentIdentityProvider({
  baseRoster,
  children,
}: {
  baseRoster: readonly NojoWorkspaceRosterEntry[];
  children: ReactNode;
}) {
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

  const value = useMemo((): AgentIdentityContextValue => {
    const overrides = version === 0 ? null : readOverrides();
    const mergedRoster = mergeWorkspaceRosterList(
      mergeSeedWithCustomRoster(baseRoster, version > 0),
      overrides,
    );
    const byId = new Map(
      mergedRoster.map((a) => [a.id.toLowerCase(), a] as const),
    );
    const getAgent = (id: string) =>
      byId.get(id.toLowerCase()) ??
      mergedRoster.find((a) => a.id === id);
    return { mergedRoster, getAgent };
  }, [baseRoster, version]);

  return (
    <AgentIdentityContext.Provider value={value}>
      {children}
    </AgentIdentityContext.Provider>
  );
}

export function useAgentIdentity(): AgentIdentityContextValue {
  const ctx = useContext(AgentIdentityContext);
  if (!ctx) {
    throw new Error("useAgentIdentity must be used within AgentIdentityProvider");
  }
  return ctx;
}

/** Returns merged roster agent when inside provider; otherwise undefined. */
export function useWorkspaceAgent(
  id: string | undefined,
): TeamWorkspaceRosterEntry | undefined {
  const ctx = useContext(AgentIdentityContext);
  if (!ctx || !id) return undefined;
  return ctx.getAgent(id);
}
