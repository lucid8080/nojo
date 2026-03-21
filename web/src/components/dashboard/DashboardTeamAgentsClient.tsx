"use client";

import { DashboardTeamStripWithSheet } from "@/components/dashboard/DashboardTeamStripWithSheet";
import type { NojoWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import { useHydratedTeamAgents } from "@/lib/nojo/useHydratedTeamAgents";

export function DashboardTeamAgentsClient({
  baseRoster,
}: {
  baseRoster: readonly NojoWorkspaceRosterEntry[];
}) {
  const teamAgents = useHydratedTeamAgents(baseRoster);
  return <DashboardTeamStripWithSheet teamAgents={teamAgents} />;
}
