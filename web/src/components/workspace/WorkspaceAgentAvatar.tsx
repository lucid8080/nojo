"use client";

import type { WorkspaceAgent } from "@/data/workspaceChatMock";
import { AvatarBubble } from "@/components/avatar/AvatarBubble";
import { useOptionalAgentDetailsSheet } from "@/components/team/AgentDetailsSheetProvider";
import { useWorkspaceAgent } from "@/components/workspace/AgentIdentityContext";
import { useHydrationSafeAgentAvatarUrl } from "@/lib/hooks/useHydrationSafeAgentAvatarUrl";
import { useResolvedAgentAccent } from "@/lib/nojo/useResolvedAgentAccent";

export function WorkspaceAgentAvatar({
  agent,
  size,
  className = "",
}: {
  agent: WorkspaceAgent;
  /** Pixel size for the avatar circle (e.g. 28, 32, 36). */
  size: number;
  className?: string;
}) {
  const merged = useWorkspaceAgent(agent.id);
  const effective = merged ?? agent;
  const visual = useResolvedAgentAccent(effective.id);

  const src = useHydrationSafeAgentAvatarUrl(effective.id);

  const category =
    visual.kind === "palette" ? visual.categoryLabel : undefined;
  const avatarAccent =
    visual.kind === "palette" ? visual.avatarAccent : undefined;

  const details = useOptionalAgentDetailsSheet();
  const bubble = (
    <AvatarBubble
      label={effective.initials}
      accentKey={effective.id}
      title={effective.name}
      src={src}
      size={size}
      className={className}
      category={category}
      avatarAccent={avatarAccent}
    />
  );

  if (details) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          details.openAgentById(effective.id);
        }}
        className="relative inline-flex cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        aria-label={`View details for ${effective.name}`}
      >
        {bubble}
      </button>
    );
  }

  return bubble;
}

