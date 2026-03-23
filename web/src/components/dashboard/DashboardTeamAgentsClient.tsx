"use client";

import { CollaboratorStrip } from "@/components/dashboard/CollaboratorStrip";
import { useAgentDetailsSheet } from "@/components/team/AgentDetailsSheetProvider";
import type { TeamAgent } from "@/data/teamPageMock";
import type { NojoWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import type { CategoryColorName } from "@/lib/categoryColors";
import { useHydratedTeamAgents } from "@/lib/nojo/useHydratedTeamAgents";
import { useMemo } from "react";

const STRIP_MAX = 7;

type StripAgent =
  | {
      id: string;
      initials: string;
      categoryLabel?: string;
      avatarAccent?: CategoryColorName;
      badge?: number;
    }
  | { id: string; initials: string; isAdd: true };

function buildStripAgents(teamAgents: TeamAgent[]): StripAgent[] {
  const slice = teamAgents.slice(0, STRIP_MAX).map((a) => ({
    id: a.id,
    initials: a.initials,
    categoryLabel: a.categoryLabel,
    avatarAccent: a.avatarAccent,
  }));
  return [...slice, { id: "add", initials: "+", isAdd: true as const }];
}

export function DashboardTeamAgentsClient({
  baseRoster,
}: {
  baseRoster: readonly NojoWorkspaceRosterEntry[];
}) {
  const teamAgents = useHydratedTeamAgents(baseRoster);
  const { openAgentById } = useAgentDetailsSheet();
  const stripAgents = useMemo(
    () => buildStripAgents(teamAgents),
    [teamAgents],
  );

  return (
    <CollaboratorStrip agents={stripAgents} onAgentClick={openAgentById} />
  );
}
