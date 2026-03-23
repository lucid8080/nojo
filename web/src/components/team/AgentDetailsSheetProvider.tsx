"use client";

import type { NojoWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import { NOJO_WORKSPACE_AGENTS } from "@/data/nojoWorkspaceRoster";
import { useHydratedTeamAgents } from "@/lib/nojo/useHydratedTeamAgents";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AgentDetailsSheet } from "./AgentDetailsSheet";

export type AgentDetailsSheetContextValue = {
  openAgentById: (id: string) => void;
  close: () => void;
};

const AgentDetailsSheetContext =
  createContext<AgentDetailsSheetContextValue | null>(null);

export function AgentDetailsSheetProvider({
  baseRoster,
  children,
  onIdentitySaved,
}: {
  baseRoster: readonly NojoWorkspaceRosterEntry[];
  children: ReactNode;
  onIdentitySaved?: () => void;
}) {
  const teamAgents = useHydratedTeamAgents(baseRoster);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const selectedAgent = useMemo(
    () =>
      selectedAgentId && selectedAgentId !== "add"
        ? teamAgents.find((a) => a.id === selectedAgentId) ?? null
        : null,
    [teamAgents, selectedAgentId],
  );

  const openAgentById = useCallback((id: string) => {
    const t = id.trim();
    if (!t || t === "add") return;
    setSelectedAgentId(t);
  }, []);

  const close = useCallback(() => setSelectedAgentId(null), []);

  const value = useMemo(
    () => ({ openAgentById, close }),
    [openAgentById, close],
  );

  const sheetOpen = Boolean(selectedAgentId && selectedAgent);

  return (
    <AgentDetailsSheetContext.Provider value={value}>
      {children}
      <AgentDetailsSheet
        agent={selectedAgent}
        open={sheetOpen}
        onClose={close}
        onIdentitySaved={onIdentitySaved}
      />
    </AgentDetailsSheetContext.Provider>
  );
}

export function useAgentDetailsSheet(): AgentDetailsSheetContextValue {
  const ctx = useContext(AgentDetailsSheetContext);
  if (!ctx) {
    throw new Error(
      "useAgentDetailsSheet must be used within AgentDetailsSheetProvider",
    );
  }
  return ctx;
}

export function useOptionalAgentDetailsSheet(): AgentDetailsSheetContextValue | null {
  return useContext(AgentDetailsSheetContext);
}

/** Convenience: canonical seed roster for dashboard + workspace agent details. */
export function NojoWorkspaceAgentDetailsProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AgentDetailsSheetProvider baseRoster={NOJO_WORKSPACE_AGENTS}>
      {children}
    </AgentDetailsSheetProvider>
  );
}
