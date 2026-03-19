import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { TopNav } from "@/components/dashboard/TopNav";
import { headerNavItems } from "@/data/dashboardSampleData";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Analytics | HireFlow",
  description: "Real-time overview of agent performance, cost, and activity",
};

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-neutral-50 to-sky-50/20 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-neutral-50">
      <TopNav items={headerNavItems} />

      <main className="mx-auto w-full max-w-[120rem] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20 lg:pt-8">
        <AnalyticsDashboard />
      </main>
    </div>
  );
}

