import { CANONICAL_NOJO_AGENT_IDS } from "@/lib/nojo/agentIdentityMap";
import { prisma } from "@/lib/db";

const CANONICAL = new Set<string>(CANONICAL_NOJO_AGENT_IDS);

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;

export type CreateWorkspaceConversationPayload = {
  title: string;
  description: string | null;
  agentIds: string[];
  primaryAgentId: string;
};

export type ValidationResult =
  | { ok: true; value: CreateWorkspaceConversationPayload }
  | { ok: false; message: string };

export function isCanonicalAgentId(id: string): boolean {
  return CANONICAL.has(id);
}

export function parseAgentIdsJson(json: unknown): string[] | null {
  if (!Array.isArray(json)) return null;
  const out: string[] = [];
  for (const x of json) {
    if (typeof x !== "string" || !x.trim()) return null;
    out.push(x.trim());
  }
  return out;
}

/** Structure validation; agent ids may be canonical or user-created (nojo-team-…). */
export function parseCreateWorkspaceConversationBody(body: unknown): ValidationResult {
  if (body === null || typeof body !== "object") {
    return { ok: false, message: "Invalid JSON body." };
  }
  const o = body as Record<string, unknown>;

  const titleRaw = typeof o.title === "string" ? o.title.trim() : "";
  if (!titleRaw) {
    return { ok: false, message: "title is required." };
  }
  if (titleRaw.length > TITLE_MAX) {
    return { ok: false, message: `title must be at most ${TITLE_MAX} characters.` };
  }

  let description: string | null = null;
  if (o.description !== undefined && o.description !== null) {
    if (typeof o.description !== "string") {
      return { ok: false, message: "description must be a string." };
    }
    const d = o.description.trim();
    if (d.length > DESCRIPTION_MAX) {
      return { ok: false, message: `description must be at most ${DESCRIPTION_MAX} characters.` };
    }
    description = d.length ? d : null;
  }

  if (!Array.isArray(o.agentIds)) {
    return { ok: false, message: "agentIds must be a non-empty array." };
  }
  const agentIds: string[] = [];
  const seen = new Set<string>();
  for (const x of o.agentIds) {
    if (typeof x !== "string" || !x.trim()) {
      return { ok: false, message: "Each agentIds entry must be a non-empty string." };
    }
    const id = x.trim();
    if (seen.has(id)) {
      return { ok: false, message: "agentIds must not contain duplicates." };
    }
    seen.add(id);
    agentIds.push(id);
  }
  if (agentIds.length === 0) {
    return { ok: false, message: "Select at least one agent." };
  }

  const primaryRaw = typeof o.primaryAgentId === "string" ? o.primaryAgentId.trim() : "";
  if (!primaryRaw) {
    return { ok: false, message: "primaryAgentId is required." };
  }
  if (!seen.has(primaryRaw)) {
    return { ok: false, message: "primaryAgentId must be one of the selected agents." };
  }

  return {
    ok: true,
    value: {
      title: titleRaw,
      description,
      agentIds,
      primaryAgentId: primaryRaw,
    },
  };
}

/**
 * Ensures each agent id is either a built-in canonical id or a user-owned `UserWorkspaceAgent` row.
 */
export async function validateCreateWorkspaceConversationBodyAsync(
  userId: string,
  body: unknown,
): Promise<ValidationResult> {
  const parsed = parseCreateWorkspaceConversationBody(body);
  if (!parsed.ok) return parsed;

  const { agentIds } = parsed.value;
  const needCheck = agentIds.filter((id) => !isCanonicalAgentId(id));
  if (needCheck.length === 0) {
    return parsed;
  }

  const rows = await prisma.userWorkspaceAgent.findMany({
    where: { userId, agentId: { in: needCheck } },
    select: { agentId: true },
  });
  const owned = new Set(rows.map((r) => r.agentId));
  for (const id of needCheck) {
    if (!owned.has(id)) {
      return {
        ok: false,
        message: `Unknown agent id: ${id}. Add this agent under My Agent Team first.`,
      };
    }
  }

  return parsed;
}
