import { TopNav } from "@/components/dashboard/TopNav";
import { headerNavItems } from "@/data/dashboardSampleData";
import type { Metadata } from "next";
import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";

export const metadata: Metadata = {
  title: "Project files | HireFlow",
  description: "List, upload, download, and version files in your project.",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="min-h-screen bg-neutral-100 text-slate-900 dark:bg-slate-950 dark:text-neutral-50">
      <TopNav items={headerNavItems} />
      <main className="mx-auto w-full max-w-[90rem] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20 lg:pt-8">
        <ProjectDetailClient projectId={projectId} />
      </main>
    </div>
  );
}

