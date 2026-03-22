"use client";

import type { TeamWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import { useWorkspaceRosterCustomAgents } from "@/lib/nojo/useWorkspaceRosterCustomAgents";
import { createContext, useContext, type ReactNode } from "react";

type WorkspaceRosterContextValue = {
  customAgents: TeamWorkspaceRosterEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const WorkspaceRosterContext = createContext<WorkspaceRosterContextValue | null>(
  null,
);

export function WorkspaceRosterProvider({ children }: { children: ReactNode }) {
  const { customAgents, loading, refresh } = useWorkspaceRosterCustomAgents();
  return (
    <WorkspaceRosterContext.Provider value={{ customAgents, loading, refresh }}>
      {children}
    </WorkspaceRosterContext.Provider>
  );
}

export function useWorkspaceRosterFromContext(): WorkspaceRosterContextValue {
  const ctx = useContext(WorkspaceRosterContext);
  if (!ctx) {
    throw new Error(
      "useWorkspaceRosterFromContext must be used within WorkspaceRosterProvider",
    );
  }
  return ctx;
}
