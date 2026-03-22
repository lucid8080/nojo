"use client";

import type { WorkspaceAgent } from "@/data/workspaceChatMock";
import { AvatarBubble } from "@/components/avatar/AvatarBubble";
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

  return (
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
}

