import { TopNav } from "@/components/dashboard/TopNav";
import { IntegrationsView } from "@/components/integrations/IntegrationsView";
import { headerNavItems } from "@/data/dashboardSampleData";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrations | HireFlow",
  description: "Connect third-party services and tools to your agents",
};

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-neutral-50 to-sky-50/20 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-neutral-50">
      <TopNav items={headerNavItems} />
      <main
        className="mx-auto w-full max-w-[120rem] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20 lg:pt-8"
      >
        <header className="mb-8">
          <p className="mb-1 text-sm font-medium text-sky-600 dark:text-sky-400">
            Integrations
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Integrations
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Connect chat providers, AI models, productivity tools, and more to your agents.
          </p>
        </header>
        <IntegrationsView />
      </main>
    </div>
  );
}
