"use client";

import type { WorkspaceAgent } from "@/data/workspaceChatMock";
import { AvatarBubble } from "@/components/avatar/AvatarBubble";
import { getAgentAvatarUrl } from "@/lib/agentAvatars";

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
  const src = getAgentAvatarUrl(agent.id, { withDefault: true });

  return (
    <AvatarBubble
      label={agent.initials}
      title={agent.name}
      src={src}
      size={size}
      className={className}
    />
  );
}

