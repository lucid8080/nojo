"use client";

import { AgentDetailsSheet } from "@/components/team/AgentDetailsSheet";
import { CollaboratorStrip } from "@/components/dashboard/CollaboratorStrip";
import type { TeamAgent } from "@/data/teamPageMock";
import { useMemo, useState } from "react";

const STRIP_MAX = 7;

type StripAgent =
  | { id: string; initials: string; categoryLabel?: string; badge?: number }
  | { id: string; initials: string; isAdd: true };

function buildStripAgents(teamAgents: TeamAgent[]): StripAgent[] {
  const slice = teamAgents.slice(0, STRIP_MAX).map((a) => ({
    id: a.id,
    initials: a.initials,
    categoryLabel: a.categoryLabel,
  }));
  return [...slice, { id: "add", initials: "+", isAdd: true as const }];
}

export function DashboardTeamStripWithSheet({
  teamAgents,
}: {
  teamAgents: TeamAgent[];
}) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const stripAgents = useMemo(
    () => buildStripAgents(teamAgents),
    [teamAgents],
  );
  const selectedAgent =
    selectedAgentId && selectedAgentId !== "add"
      ? teamAgents.find((a) => a.id === selectedAgentId) ?? null
      : null;
  const sheetOpen = Boolean(selectedAgentId && selectedAgent);

  return (
    <>
      <CollaboratorStrip
        agents={stripAgents}
        onAgentClick={(id) => setSelectedAgentId(id)}
      />
      <AgentDetailsSheet
        agent={selectedAgent}
        open={sheetOpen}
        onClose={() => setSelectedAgentId(null)}
      />
    </>
  );
}
