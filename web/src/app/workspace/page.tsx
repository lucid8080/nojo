import { CollaboratorStrip } from "@/components/dashboard/CollaboratorStrip";
import { TopNav } from "@/components/dashboard/TopNav";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import {
  collaboratorAgents,
  headerNavItems,
} from "@/data/dashboardSampleData";
import { workspaceConversations } from "@/data/workspaceChatMock";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent workspace | Nojoblem",
  description: "Chat with hired AI agents across jobs and deliverables",
};

type Props = {
  searchParams?: Promise<{ conversation?: string }>;
};

export default async function WorkspacePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const raw = typeof sp.conversation === "string" ? sp.conversation.trim() : "";
  const initialConversationId =
    raw && workspaceConversations.some((c) => c.id === raw) ? raw : null;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-neutral-100 via-neutral-50 to-sky-50/20 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-neutral-50">
      <TopNav items={headerNavItems} />

      <main
        className="mx-auto flex w-full max-w-[100rem] flex-1 min-h-0 flex-col overflow-hidden px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8"
      >
        <div className="mb-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-sky-600 dark:text-sky-400">
              Nojoblem
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Agent workspace
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-neutral-400">
              One inbox for every hired agent — jobs, logs, deliverables, and
              approvals. Mock data for demo.
            </p>
          </div>
          <CollaboratorStrip agents={collaboratorAgents} />
        </div>

        <WorkspaceShell initialConversationId={initialConversationId} />
      </main>
    </div>
  );
}

