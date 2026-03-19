import { TopNav } from "@/components/dashboard/TopNav";
import { MarketplaceView } from "@/components/marketplace/MarketplaceView";
import agencyData from "@/data/agencyAgents.json";
import type { AgencyAgentsPayload } from "@/data/agencyAgents.types";
import { headerNavItems } from "@/data/dashboardSampleData";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Skills | HireFlow",
  description: "Browse AI agent personalities from The Agency (agency-agents)",
};

const data = agencyData as AgencyAgentsPayload;

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-neutral-50 to-sky-50/20 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-neutral-50">
      <TopNav items={headerNavItems} />
      <main
        className="mx-auto w-full max-w-[120rem] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20 lg:pt-8"
      >
        <header className="mb-8">
          <p className="mb-1 text-sm font-medium text-sky-600 dark:text-sky-400">
            Marketplace
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Agent skills
          </h1>
        </header>
        <MarketplaceView data={data} />
      </main>
    </div>
  );
}
