export const CANONICAL_NOJO_AGENT_IDS = [
  "nojo-main",
  "nojo-builder",
  "nojo-support",
  "nojo-sales",
  "nojo-content",
] as const;

export const LEGACY_ALIAS_TO_NOJO_ID: Record<string, (typeof CANONICAL_NOJO_AGENT_IDS)[number]> = {
  nova: "nojo-content",
  kite: "nojo-sales",
  mira: "nojo-main",
  ellis: "nojo-builder",
  juno: "nojo-support",
};

export function canonicalizeNojoAgentIdForClient(agentId: string): string {
  const requested = agentId.trim();
  const lowered = requested.toLowerCase();
  const canonicalMatch = CANONICAL_NOJO_AGENT_IDS.find((id) => id.toLowerCase() === lowered);
  if (canonicalMatch) return canonicalMatch;
  return LEGACY_ALIAS_TO_NOJO_ID[lowered] ?? requested;
}
