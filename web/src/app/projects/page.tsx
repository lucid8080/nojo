import { TopNav } from "@/components/dashboard/TopNav";
import { headerNavItems } from "@/data/dashboardSampleData";
import type { Metadata } from "next";
import { ProjectsPageClient } from "@/components/projects/ProjectsPageClient";

export const metadata: Metadata = {
  title: "Projects | HireFlow",
  description: "Your durable containers for drafts, exports, and notes",
};

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-neutral-100 text-slate-900 dark:bg-slate-950 dark:text-neutral-50">
      <TopNav items={headerNavItems} />
      <main className="mx-auto w-full max-w-[90rem] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20 lg:pt-8">
        <header className="mb-6">
          <p className="mb-1 text-sm font-medium text-sky-600 dark:text-sky-400">
            Projects
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Durable file containers
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Upload and version drafts per project. Bytes are stored outside chat history.
          </p>
        </header>

        <ProjectsPageClient />
      </main>
    </div>
  );
}

