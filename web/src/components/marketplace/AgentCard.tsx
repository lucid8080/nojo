import type { AgencyAgent } from "@/data/agencyAgents.types";
import { getCategoryCardClasses, getCategoryTagClasses } from "@/lib/categoryColors";

export function AgentCard({ agent }: { agent: AgencyAgent }) {
  return (
    <a
      href={agent.githubUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex h-full min-h-[18rem] flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/90 p-4 pl-3 shadow-sm transition hover:border-neutral-300 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/60 dark:shadow-black/20 dark:hover:border-slate-600 ${getCategoryCardClasses(agent.categoryLabel)}`}
    >
      <span
        className={`mb-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getCategoryTagClasses(agent.categoryLabel)}`}
      >
        {agent.categoryLabel}
      </span>
      <h3 className="mb-2 line-clamp-2 text-sm font-bold leading-snug text-slate-900 dark:text-neutral-100">
        {agent.title}
      </h3>
      <p className="mb-4 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        {agent.description}
      </p>
      <div className="mt-auto flex items-center gap-1.5 text-slate-500 dark:text-slate-500">
        <span className="text-sm" aria-hidden>
          👍
        </span>
        <span className="text-xs tabular-nums">0</span>
      </div>
    </a>
  );
}
