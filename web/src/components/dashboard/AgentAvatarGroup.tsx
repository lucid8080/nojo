"use client";

import { AvatarBubble } from "@/components/avatar/AvatarBubble";
import { useHydrationSafeAgentAvatarUrl } from "@/lib/hooks/useHydrationSafeAgentAvatarUrl";
import { useResolvedAgentAccent } from "@/lib/nojo/useResolvedAgentAccent";

function initialsFromAgentName(name: string): string {
  const parts = name.replace(/ Agent$/i, "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const bubbleBase =
  "flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-white";

function AgentAvatarBubble({ name, avatarKey }: { name: string; avatarKey: string }) {
  const visual = useResolvedAgentAccent(avatarKey);
  const src = useHydrationSafeAgentAvatarUrl(avatarKey);

  const category = visual.kind === "palette" ? visual.categoryLabel : undefined;
  const accent = visual.kind === "palette" ? visual.avatarAccent : undefined;

  return (
    <AvatarBubble
      label={initialsFromAgentName(name)}
      accentKey={avatarKey}
      title={name}
      src={src}
      size={28}
      category={category}
      avatarAccent={accent}
      className="text-[10px]"
    />
  );
}

export function AgentAvatarGroup({
  agents,
  agentIds,
  max = 4,
}: {
  agents: string[];
  /** Same order as agents; canonical id for avatar map. Omit for legacy name-only keys. */
  agentIds?: readonly string[];
  max?: number;
}) {
  const shown = agents.slice(0, max);
  const extra = agents.length - max;
  const ids = agentIds ?? [];
  return (
    <div className="flex items-center -space-x-2" title={agents.join(", ")}>
      {shown.map((name, i) => (
        <AgentAvatarBubble
          key={`${ids[i] ?? name}-${i}`}
          name={name}
          avatarKey={ids[i] ?? name}
        />
      ))}
      {extra > 0 ? (
        <span
          className={`${bubbleBase} size-7 bg-neutral-200 text-neutral-600 dark:bg-slate-700 dark:text-neutral-300`}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
