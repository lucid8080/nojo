import { DashboardTeamStripWithSheet } from "@/components/dashboard/DashboardTeamStripWithSheet";
import { JobBoard } from "@/components/dashboard/JobBoard";
import { SuggestedAgentsCard } from "@/components/dashboard/SuggestedAgentsCard";
import { TopNav } from "@/components/dashboard/TopNav";
import { SmartSuggestionsPanel } from "@/components/dashboard/SmartSuggestionsPanel";
import {
  suggestedAgentsRows,
  headerNavItems,
} from "@/data/dashboardSampleData";
import { teamAgentsMock } from "@/data/teamPageMock";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent work board | HireFlow",
  description: "Live AI agent job stream and execution logs",
};

export default function DashboardPage() {
  const agentBoardDemo =
    process.env.NEXT_PUBLIC_AGENT_BOARD_DEMO !== "false";

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-neutral-50 to-sky-50/20 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-neutral-50">
      <TopNav items={headerNavItems} />

      <main
        className="mx-auto w-full max-w-[120rem] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20 lg:pt-8"
      >
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Agent work board
            </h1>
          </div>
          <DashboardTeamStripWithSheet teamAgents={teamAgentsMock} />
        </header>

        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-8">
          <aside className="order-2 flex w-full shrink-0 flex-col gap-8 xl:order-1 xl:sticky xl:top-28 xl:w-80">
            <SmartSuggestionsPanel />
            <SuggestedAgentsCard rows={suggestedAgentsRows} />
          </aside>
          <div className="order-1 min-w-0 flex-1 xl:order-2">
            <JobBoard demoMode={agentBoardDemo} />
          </div>
        </div>
      </main>
    </div>
  );
}
