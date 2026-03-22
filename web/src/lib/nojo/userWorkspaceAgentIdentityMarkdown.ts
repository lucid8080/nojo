import type { UserWorkspaceAgent } from "@prisma/client";

import { bundledSkillEntriesForSkillIds } from "@/data/marketplaceSkillCatalog";
import type { NojoAgentIdentityOverride } from "@/lib/nojo/agentIdentityOverrides";
import { identityJsonFromRow } from "@/lib/workspace/userWorkspaceAgentServer";

/** Max chars for USER/MEMORY one-line excerpts in first-turn fallback (matches repo agent path). */
export const USER_WORKSPACE_FIRST_TURN_SNIPPET_MAX = 400;

export type UserWorkspaceIdentityInput = {
  agentId: string;
  name: string;
  role: string;
  identity: NojoAgentIdentityOverride | undefined;
};

export function userWorkspaceIdentityInputFromRow(row: UserWorkspaceAgent): UserWorkspaceIdentityInput {
  return {
    agentId: row.agentId,
    name: row.name,
    role: row.role,
    identity: identityJsonFromRow(row),
  };
}

function oneLineExcerpt(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** Stable fingerprint for regenerating runtime files when DB identity changes. */
export function fingerprintUserWorkspaceIdentity(input: UserWorkspaceIdentityInput): string {
  const { agentId, name, role, identity } = input;
  const payload = {
    agentId,
    name,
    role,
    identity: identity ?? null,
  };
  return JSON.stringify(payload);
}

export function buildUserWorkspaceIdentityMd(input: UserWorkspaceIdentityInput): string {
  const idv = input.identity ?? {};
  const emoji = idv.emoji?.trim();
  const vibe = idv.vibe?.trim();
  const desc = idv.description?.trim();
  const obj = idv.objective?.trim();
  const category = idv.categoryLabel?.trim();

  const lines: string[] = [
    `# ${input.name} — IDENTITY (user workspace agent)`,
    `<!-- NOJO_USER_TEAM_AGENT_V1 -->`,
    ``,
    `## Identity`,
    ``,
    `- Agent ID (durable): \`${input.agentId}\``,
    `- Display name: **${input.name}**`,
  ];
  if (emoji) lines.push(`- Emoji / flavor: \`${emoji}\``);
  lines.push(`- Core role: ${input.role}`);
  if (category) lines.push(`- Category: ${category}`);
  lines.push(
    `- Scope: User-defined workspace agent. Follow this IDENTITY and SOUL; do not treat yourself as an uninitialized or generic assistant.`,
    ``,
    `## Default vibe and self-description`,
    ``,
  );
  if (vibe) {
    lines.push(`- Vibe / tone / personality: ${vibe}`);
  } else {
    lines.push(`- Vibe / tone / personality: (set in Team settings)`);
  }
  if (desc) {
    lines.push(`- Short description: ${desc}`);
  }
  if (obj) {
    lines.push(`- Role & objective: ${obj}`);
  }
  lines.push(
    ``,
    `## Non-drift rules`,
    ``,
    `- Stay consistent with this identity unless the user changes it in Team settings.`,
    `- Do not invent a different name, creature archetype, or unrelated persona.`,
    `- Shared Nojo product context may appear in the prompt; use it for facts, but keep your role and voice from SOUL.md.`,
    ``,
    `## Shared knowledge allowed`,
    ``,
    `- You may use injected Nojo workspace docs (e.g. ACTIVE_CONTEXT, BRAND_VOICE) for product-accurate answers.`,
    `- Prefer clarifying questions over inventing product or user-specific facts.`,
  );
  return lines.join("\n");
}

export function buildUserWorkspaceSoulMd(input: UserWorkspaceIdentityInput): string {
  const idv = input.identity ?? {};
  const vibe = idv.vibe?.trim();
  const obj = idv.objective?.trim();
  const roleLine = input.role.trim() || "Workspace agent";

  const parts: string[] = [
    `# ${input.name} — SOUL (role + voice)`,
    `<!-- NOJO_USER_TEAM_AGENT_V1 -->`,
    ``,
    `You are **${input.name}**${idv.emoji?.trim() ? ` (${idv.emoji.trim()})` : ""}, a user-defined agent in this Nojo workspace.`,
    ``,
    `## Role expression`,
    ``,
    `- Primary role: ${roleLine}.`,
  ];
  if (obj) {
    parts.push(`- Objective: ${obj}`);
  }
  parts.push(
    ``,
    `## Default operating mode`,
    ``,
    `- Answer in character using the role and objective above.`,
    `- Prefer clarity and concrete next steps.`,
    `- If requirements are ambiguous, ask brief clarifying questions.`,
    ``,
    `## Tone and personality`,
    ``,
  );
  if (vibe) {
    parts.push(vibe);
  } else {
    parts.push(`- Professional, helpful, aligned with the role in IDENTITY.md.`);
  }
  parts.push(
    ``,
    `## Identity boundaries`,
    ``,
    `- Do not ask the user to pick your name, creature type, emoji, or vibe unless they explicitly want to change them.`,
    `- Do not roleplay as an unrelated character; stay within this workspace agent’s purpose.`,
    `- No generic “I just came online / who am I?” bootstrap — you already have IDENTITY and SOUL.`,
  );
  return parts.join("\n");
}

export function buildUserWorkspaceUserMd(input: UserWorkspaceIdentityInput): string {
  const idv = input.identity ?? {};
  const skills = idv.assignedSkillIds?.length
    ? idv.assignedSkillIds.join(", ")
    : "none listed";
  const bundled = bundledSkillEntriesForSkillIds(idv.assignedSkillIds);
  const bundledLines =
    bundled.length > 0
      ? [
          ``,
          `## Bundled skill packs (full procedures)`,
          ``,
          ...bundled.map(
            (b) =>
              `- **${b.name}** (\`${b.skillId}\`): read \`skills/${b.contentSlug}/SKILL.md\` first; supporting material lives under \`skills/${b.contentSlug}/references/\` and \`skills/${b.contentSlug}/templates/\` when present.`,
          ),
        ]
      : [];
  return [
    `# ${input.name} — USER (what to ask)`,
    ``,
    `Ask this agent when you want help that fits:`,
    ``,
    `- Role: ${input.role}`,
    idv.objective?.trim() ? `- Objective: ${idv.objective.trim()}` : null,
    `- Assigned skill ids (catalog): ${skills}`,
    ...bundledLines,
    ``,
    `Suggested prompt format:`,
    ``,
    `1. Goal (one sentence)`,
    `2. Constraints`,
    `3. What “good” looks like`,
    ``,
  ]
    .filter((x): x is string => x != null)
    .join("\n");
}

export function buildUserWorkspaceMemoryMd(input: UserWorkspaceIdentityInput): string {
  return [
    `# ${input.name} — MEMORY (long-term notes)`,
    ``,
    `This file is long-term memory for this workspace agent.`,
    ``,
    `## Store`,
    ``,
    `- User preferences stated in chat (non-sensitive)`,
    `- Recurring constraints for this role`,
    `- Decisions the user wants remembered for future turns`,
    ``,
    `## Do not store here`,
    ``,
    `- Secrets or credentials`,
    `- Other agents’ private memory`,
    ``,
    `## Daily notes`,
    ``,
    `Write incremental updates into \`memory/<YYYY-MM-DD>.md\` when using file tools.`,
    ``,
  ].join("\n");
}

export function buildUserWorkspaceAgentsMd(input: UserWorkspaceIdentityInput): string {
  return [
    `# ${input.name} — AGENTS (handoff map)`,
    ``,
    `## Owns`,
    ``,
    `- Tasks and advice within: ${input.role}`,
    ``,
    `## Delegates`,
    ``,
    `- Other Nojo workspace agents (e.g. \`nojo-main\`, \`nojo-builder\`) when the user asks for work outside this role or when collaboration is needed.`,
    ``,
    `## Handoff rule`,
    ``,
    `When delegating, include the objective slice, constraints, and what must stay fixed.`,
    ``,
  ].join("\n");
}

/**
 * First-turn prompt block (mirrors NOJO_AGENT_REPO_IDENTITY_FALLBACK shape for canonical agents).
 */
export function buildUserWorkspaceFirstTurnFallbackBlock(
  input: UserWorkspaceIdentityInput,
): string | null {
  const identity = buildUserWorkspaceIdentityMd(input).trim();
  const soul = buildUserWorkspaceSoulMd(input).trim();
  if (!identity && !soul) return null;

  const idv = input.identity ?? {};
  const userRaw = buildUserWorkspaceUserMd(input);
  const memoryRaw = buildUserWorkspaceMemoryMd(input);
  const userLine = oneLineExcerpt(userRaw, USER_WORKSPACE_FIRST_TURN_SNIPPET_MAX);
  const memoryLine = oneLineExcerpt(memoryRaw, USER_WORKSPACE_FIRST_TURN_SNIPPET_MAX);

  const parts: string[] = [
    `NOJO_USER_AGENT_IDENTITY_FALLBACK (first user message only; OpenClaw runtime workspace remains the source of truth for tools and persistent memory).`,
    ``,
    `---`,
    `IDENTITY.md`,
    `---`,
    identity,
    ``,
    `---`,
    `SOUL.md`,
    `---`,
    soul,
  ];
  if (userLine) {
    parts.push("", `---`, `USER.md (excerpt)`, `---`, userLine);
  }
  if (memoryLine) {
    parts.push("", `---`, `MEMORY.md (excerpt)`, `---`, memoryLine);
  }
  return parts.join("\n");
}
