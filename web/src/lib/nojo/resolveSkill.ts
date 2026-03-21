import type { AgencyAgent, AgencyAgentsPayload } from "@/data/agencyAgents.types";
import agencyData from "@/data/agencyAgents.json";
import type { ImportableSkill } from "@/data/teamPageMock";
import { importableSkillsMock } from "@/data/teamPageMock";

const agencyPayload = agencyData as AgencyAgentsPayload;

export type ResolvedSkill =
  | { kind: "agency"; agent: AgencyAgent; payload: AgencyAgentsPayload }
  | { kind: "importable"; skill: ImportableSkill };

/** URL path segment for `/skills/[skillId]` — encodes slashes in agency ids. */
export function skillDetailHref(canonicalId: string): string {
  return `/skills/${encodeURIComponent(canonicalId)}`;
}

export function decodeSkillIdParam(encoded: string): string {
  const t = encoded.trim();
  if (!t) return "";
  try {
    return decodeURIComponent(t);
  } catch {
    return "";
  }
}

export function resolveSkillByCanonicalId(
  canonicalId: string,
): ResolvedSkill | null {
  if (!canonicalId) return null;
  const imp = importableSkillsMock.find((s) => s.id === canonicalId);
  if (imp) return { kind: "importable", skill: imp };
  const ag = agencyPayload.agents.find((a) => a.id === canonicalId);
  if (ag) return { kind: "agency", agent: ag, payload: agencyPayload };
  return null;
}

export function resolveSkillByEncodedId(encoded: string): ResolvedSkill | null {
  const id = decodeSkillIdParam(encoded);
  if (!id) return null;
  return resolveSkillByCanonicalId(id);
}
