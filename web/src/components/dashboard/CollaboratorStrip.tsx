"use client";

import type { collaboratorAgents } from "@/data/dashboardSampleData";
import { AvatarBubble } from "@/components/avatar/AvatarBubble";
import { getAgentAvatarUrl } from "@/lib/agentAvatars";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Agent = (typeof collaboratorAgents)[number];

export function CollaboratorStrip({
  agents,
  onAgentClick,
}: {
  agents: readonly Agent[];
  /** When provided, agent avatars are clickable and this is called with the agent id (not called for the add button). */
  onAgentClick?: (agentId: string) => void;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Team
      </span>
      <div className="flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white/90 py-1.5 pl-1.5 pr-2 shadow-sm dark:border-slate-600 dark:bg-slate-800/80">
        {agents.map((agent) =>
          "isAdd" in agent && agent.isAdd ? (
            <button
              key={agent.id}
              type="button"
              aria-label="Create agent"
              title="Create Agent"
              onClick={() => router.push("/team?create=1")}
              className="flex size-9 items-center justify-center rounded-full border-2 border-dashed border-neutral-300 text-slate-400 transition hover:border-sky-400 hover:text-sky-600 dark:border-slate-500 dark:hover:border-sky-500"
            >
              <span className="text-lg font-medium leading-none">+</span>
            </button>
          ) : (
            <CollaboratorBubble
              key={agent.id}
              agent={agent as Exclude<Agent, { id: string; initials: string; isAdd: true }>}
              onAgentClick={onAgentClick}
            />
          ),
        )}
      </div>
    </div>
  );
}

function CollaboratorBubble({
  agent,
  onAgentClick,
}: {
  agent: Exclude<(typeof collaboratorAgents)[number], { id: string; initials: string; isAdd: true }>;
  onAgentClick?: (agentId: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(getAgentAvatarUrl(agent.id, { withDefault: true }));
  }, [agent.id]);

  const avatar = (
    <>
      <AvatarBubble
        label={agent.initials}
        src={src}
        size={36}
        category={"categoryLabel" in agent ? agent.categoryLabel : undefined}
      />
      {"badge" in agent && agent.badge != null ? (
        <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-rose-400 px-1 text-xs font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900">
          {agent.badge}
        </span>
      ) : null}
    </>
  );

  if (onAgentClick) {
    return (
      <button
        type="button"
        onClick={() => onAgentClick(agent.id)}
        className="relative inline-flex cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        aria-label={`View details for ${agent.initials}`}
      >
        {avatar}
      </button>
    );
  }

  return <span className="relative inline-flex">{avatar}</span>;
}
