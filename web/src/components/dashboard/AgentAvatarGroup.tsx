"use client";

import { useEffect, useState } from "react";
import { getAgentAvatarUrl, getAvatarAccentClasses } from "@/lib/agentAvatars";

function initialsFromAgentName(name: string): string {
  const parts = name.replace(/ Agent$/i, "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const bubbleBase =
  "flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-white";

export function AgentAvatarGroup({
  agents,
  max = 4,
}: {
  agents: string[];
  max?: number;
}) {
  const shown = agents.slice(0, max);
  const extra = agents.length - max;
  return (
    <div className="flex items-center -space-x-2" title={agents.join(", ")}>
      {shown.map((name, i) => (
        <AgentAvatarBubble key={`${name}-${i}`} name={name} />
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

function AgentAvatarBubble({ name }: { name: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const { frame, fallback } = getAvatarAccentClasses(name);
  const size = 28;
  const pad = 2;
  const inner = size - pad * 2;

  useEffect(() => {
    setSrc(getAgentAvatarUrl(name, { withDefault: true }));
  }, [name]);

  const hoverClasses =
    "transition-transform duration-200 ease-out hover:scale-110";
  if (src) {
    return (
      <span
        title={name}
        className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full ring-2 ring-white ${hoverClasses} ${frame}`}
        style={{ padding: pad }}
      >
        <img
          src={src}
          alt={name}
          width={inner}
          height={inner}
          className="rounded-full object-cover"
          style={{ width: inner, height: inner, minWidth: inner, minHeight: inner }}
          loading="lazy"
        />
      </span>
    );
  }

  return (
    <span className={`${bubbleBase} size-7 ${hoverClasses} ${fallback}`} title={name}>
      {initialsFromAgentName(name)}
    </span>
  );
}
