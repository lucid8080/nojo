import { AgentScheduleCalendar } from "@/components/dashboard/AgentScheduleCalendar";
import { CollaboratorStrip } from "@/components/dashboard/CollaboratorStrip";
import { TopNav } from "@/components/dashboard/TopNav";
import {
  collaboratorAgents,
  headerNavItems,
} from "@/data/dashboardSampleData";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent schedules | HireFlow",
  description: "Calendar of scheduled agent tasks",
};

export default function SchedulesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-neutral-50 to-sky-50/20 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-neutral-50">
      <TopNav items={headerNavItems} />

      <main
        className="mx-auto w-full max-w-[90rem] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20 lg:pt-8"
      >
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Agent schedules
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-neutral-400">
              Scheduled tasks across your agent workforce. Mock data — replace with API.
            </p>
          </div>
          <CollaboratorStrip agents={collaboratorAgents} />
        </header>

        <AgentScheduleCalendar />
      </main>
    </div>
  );
}

