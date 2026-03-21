import "server-only";

import { CANONICAL_NOJO_AGENT_IDS, LEGACY_ALIAS_TO_NOJO_ID } from "./agentIdentityMap";

export type CanonicalizedAgentId = {
  requestedAgentId: string;
  effectiveAgentId: string;
  matchedNojoAgent: boolean;
  matchedLegacyAlias: boolean;
  legacyAliasUsed?: string;
};

export function canonicalizeAgentId(agentId: string | undefined | null): CanonicalizedAgentId {
  const requestedAgentId = typeof agentId === "string" ? agentId.trim() : "";
  const requestedLower = requestedAgentId.toLowerCase();

  const nojoIds = new Set(CANONICAL_NOJO_AGENT_IDS.map((id) => id.toLowerCase()));
  const matchedNojoAgent = nojoIds.has(requestedLower);
  if (matchedNojoAgent) {
    // Preserve the exact canonical nojo id casing from the known list.
    const effective =
      CANONICAL_NOJO_AGENT_IDS.find((id) => id.toLowerCase() === requestedLower) ?? requestedAgentId;
    return {
      requestedAgentId,
      effectiveAgentId: effective,
      matchedNojoAgent: true,
      matchedLegacyAlias: false,
    };
  }

  const aliasTarget = LEGACY_ALIAS_TO_NOJO_ID[requestedLower];
  if (aliasTarget) {
    return {
      requestedAgentId,
      effectiveAgentId: aliasTarget,
      matchedNojoAgent: false,
      matchedLegacyAlias: true,
      legacyAliasUsed: requestedLower,
    };
  }

  return {
    requestedAgentId,
    effectiveAgentId: requestedAgentId,
    matchedNojoAgent: false,
    matchedLegacyAlias: false,
  };
}
