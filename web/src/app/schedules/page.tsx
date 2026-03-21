import { AgentScheduleCalendar } from "@/components/dashboard/AgentScheduleCalendar";
import { TopNav } from "@/components/dashboard/TopNav";
import { headerNavItems } from "@/data/dashboardSampleData";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Scheduled jobs | HireFlow",
  description: "Manage recurring automations and upcoming runs",
};

export default function SchedulesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-neutral-50 to-sky-50/20 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-neutral-50">
      <TopNav items={headerNavItems} />

      <main
        className="mx-auto w-full max-w-[90rem] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20 lg:pt-8"
      >
        <header className="mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Scheduled jobs
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-neutral-400">
              Manage recurring automations and upcoming runs. Sign in to view your team&apos;s schedule.
            </p>
          </div>
        </header>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-neutral-200/80 bg-white/60 px-6 py-16 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-neutral-400">
              Loading schedules…
            </div>
          }
        >
          <AgentScheduleCalendar />
        </Suspense>
      </main>
    </div>
  );
}

