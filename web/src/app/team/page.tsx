import { TeamPageView } from "@/components/team/TeamPageView";
import { TopNav } from "@/components/dashboard/TopNav";
import {
  collaboratorAgents,
  headerNavItems,
} from "@/data/dashboardSampleData";
import { teamAgentsMock } from "@/data/teamPageMock";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Agent Team | HireFlow",
  description:
    "Manage your AI workforce, create agents, and import Marketplace skills",
};

type Props = {
  searchParams?: Promise<{ empty?: string; create?: string }>;
};

export default async function TeamPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const showEmpty = sp.empty === "1" || sp.empty === "true";
  const autoScrollToCreateAgent =
    sp.create === "1" || sp.create === "true";
  const initialAgents = showEmpty ? [] : teamAgentsMock;

  return (
    <div className="min-h-screen bg-neutral-100 text-slate-900 dark:bg-slate-950 dark:text-neutral-50">
      <TopNav items={headerNavItems} />

      {/* Symmetric padding: no fixed left rail on this route (unlike --left-rail-offset layouts). */}
      <main className="mx-auto w-full max-w-[120rem] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20 lg:pt-8">
        <TeamPageView
          initialAgents={initialAgents}
          collaboratorAgents={collaboratorAgents}
          autoScrollToCreateAgent={autoScrollToCreateAgent}
        />
      </main>
    </div>
  );
}

