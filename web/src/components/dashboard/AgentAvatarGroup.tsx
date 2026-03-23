"use client";

import { AvatarBubble } from "@/components/avatar/AvatarBubble";
import { useOptionalAgentDetailsSheet } from "@/components/team/AgentDetailsSheetProvider";
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
  "flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white";

const avatarButtonRing =
  "relative inline-flex cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

function AgentAvatarBubble({
  name,
  avatarKey,
  size,
  onOpenDetails,
}: {
  name: string;
  avatarKey: string;
  size: number;
  /** When set, avatar is wrapped in a button that opens agent details. */
  onOpenDetails?: () => void;
}) {
  const visual = useResolvedAgentAccent(avatarKey);
  const src = useHydrationSafeAgentAvatarUrl(avatarKey);

  const category = visual.kind === "palette" ? visual.categoryLabel : undefined;
  const accent = visual.kind === "palette" ? visual.avatarAccent : undefined;
  const textClass = size >= 36 ? "text-xs" : "text-[10px]";

  const bubble = (
    <AvatarBubble
      label={initialsFromAgentName(name)}
      accentKey={avatarKey}
      title={name}
      src={src}
      size={size}
      category={category}
      avatarAccent={accent}
      className={textClass}
    />
  );

  if (onOpenDetails) {
    return (
      <button
        type="button"
        className={avatarButtonRing}
        onClick={onOpenDetails}
        aria-label={`View details for ${name}`}
      >
        {bubble}
      </button>
    );
  }

  return bubble;
}

export function AgentAvatarGroup({
  agents,
  agentIds,
  max = 4,
  /** Pixel diameter for each avatar (default 28). */
  avatarSize = 28,
}: {
  agents: string[];
  /** Same order as agents; canonical id for avatar map. Omit for legacy name-only keys. */
  agentIds?: readonly string[];
  max?: number;
  avatarSize?: number;
}) {
  const details = useOptionalAgentDetailsSheet();
  const shown = agents.slice(0, max);
  const extra = agents.length - max;
  const ids = agentIds ?? [];
  const overlapClass = avatarSize >= 36 ? "-space-x-3" : "-space-x-2";
  const extraTextClass = avatarSize >= 36 ? "text-xs" : "text-[10px]";
  const px = `${avatarSize}px`;

  return (
    <div className={`flex items-center ${overlapClass}`} title={agents.join(", ")}>
      {shown.map((name, i) => {
        const key = ids[i] ?? name;
        const open =
          details && key.trim()
            ? () => details.openAgentById(key)
            : undefined;
        return (
          <AgentAvatarBubble
            key={`${key}-${i}`}
            name={name}
            avatarKey={key}
            size={avatarSize}
            onOpenDetails={open}
          />
        );
      })}
      {extra > 0 ? (
        <span
          className={`${bubbleBase} bg-neutral-200 text-neutral-600 dark:bg-slate-700 dark:text-neutral-300 ${extraTextClass}`}
          style={{ width: px, height: px, minWidth: px, minHeight: px }}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
