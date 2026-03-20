import "server-only";

/**
 * Deterministic OpenClaw session key for a Nojo workspace conversation.
 * Mirrors WebChat-style routing: agent-scoped + webchat channel + stable peer id.
 *
 * TODO: If your gateway uses a different key layout, set OPENCLAW_SESSION_KEY_PREFIX
 * or extend this helper to match `openclaw sessions --json` keys.
 */
export function buildWorkspaceGatewaySessionKey(opts: {
  userId: string;
  conversationId: string;
  agentId?: string;
}): string {
  const agent = (opts.agentId?.trim() || "main").slice(0, 120);
  const uid = opts.userId.trim();
  const cid = opts.conversationId.trim();
  const raw = `agent:${agent}:webchat:direct:nojo:${uid}:${cid}`;
  return raw.length > 512 ? raw.slice(0, 512) : raw;
}
