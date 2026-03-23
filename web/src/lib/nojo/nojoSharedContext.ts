import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { bundledSkillEntriesForSkillIds } from "@/data/marketplaceSkillCatalog";
import { prisma } from "@/lib/db";
import { isUserCreatedWorkspaceAgentId } from "@/lib/workspace/userWorkspaceAgentServer";

import { CANONICAL_NOJO_AGENT_IDS } from "./agentIdentityMap";
import { resolveRepoNojoAgentTemplateRoot } from "./nojoAgentRepoPaths";
import {
  buildUserWorkspaceFirstTurnFallbackBlock,
  userWorkspaceIdentityInputFromRow,
} from "./userWorkspaceAgentIdentityMarkdown";

const NOJO_AGENT_IDS = new Set<string>(CANONICAL_NOJO_AGENT_IDS);

export type NojoAgentId = (typeof NOJO_AGENT_IDS extends Set<infer T> ? T : never) & string;

const NOJO_DOC_FILES = {
  PROJECT_CONTEXT: "PROJECT_CONTEXT.md",
  ACTIVE_CONTEXT: "ACTIVE_CONTEXT.md",
  ROADMAP: "ROADMAP.md",
  PRODUCT: "PRODUCT.md",
  DECISIONS: "DECISIONS.md",
  BRAND_VOICE: "BRAND_VOICE.md",
} as const;

type NojoDocFile = (typeof NOJO_DOC_FILES)[keyof typeof NOJO_DOC_FILES];

const docTextCache = new Map<NojoDocFile, string>();
let nojoProjectsRootPromise: Promise<string> | null = null;

export function isNojoAgentId(agentId: string | undefined | null): agentId is NojoAgentId {
  if (!agentId) return false;
  return NOJO_AGENT_IDS.has(agentId);
}

const FIRST_TURN_SNIPPET_MAX = 400;

function isNojoFirstTurnIdentityFallbackEnabled(): boolean {
  const raw = process.env.NOJO_FIRST_TURN_IDENTITY_FALLBACK?.trim().toLowerCase() ?? "";
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  return true;
}

async function loadRepoFirstTurnIdentityFallback(agentId: NojoAgentId): Promise<string | null> {
  const root = await resolveRepoNojoAgentTemplateRoot(agentId);
  const readUtf8 = async (name: string) => {
    try {
      return await fs.readFile(path.join(root, name), "utf8");
    } catch {
      return "";
    }
  };

  const [identity, soul, userRaw, memoryRaw] = await Promise.all([
    readUtf8("IDENTITY.md"),
    readUtf8("SOUL.md"),
    readUtf8("USER.md"),
    readUtf8("MEMORY.md"),
  ]);

  if (!identity.trim() && !soul.trim()) {
    return null;
  }

  const oneLine = (text: string) => {
    const t = text.trim().replace(/\s+/g, " ");
    if (!t) return "";
    return t.length > FIRST_TURN_SNIPPET_MAX ? `${t.slice(0, FIRST_TURN_SNIPPET_MAX)}…` : t;
  };

  const userLine = oneLine(userRaw);
  const memoryLine = oneLine(memoryRaw);

  const parts: string[] = [
    `NOJO_AGENT_REPO_IDENTITY_FALLBACK (first user message only; OpenClaw runtime workspace remains the source of truth for tools and persistent memory).`,
    "",
    `---`,
    `IDENTITY.md`,
    `---`,
    identity.trim(),
    "",
    `---`,
    `SOUL.md`,
    `---`,
    soul.trim(),
  ];

  if (userLine) {
    parts.push("", `---`, `USER.md (excerpt)`, `---`, userLine);
  }
  if (memoryLine) {
    parts.push("", `---`, `MEMORY.md (excerpt)`, `---`, memoryLine);
  }

  return parts.join("\n");
}

async function resolveNojoProjectsRoot(): Promise<string> {
  if (nojoProjectsRootPromise) return nojoProjectsRootPromise;

  nojoProjectsRootPromise = (async () => {
    // In Next.js, `process.cwd()` can vary depending on how the server is launched.
    // Walk upward until we find `projects/nojo/ACTIVE_CONTEXT.md`.
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      const candidate = path.join(dir, "projects", "nojo");
      try {
        await fs.access(path.join(candidate, NOJO_DOC_FILES.ACTIVE_CONTEXT));
        return candidate;
      } catch {
        // try parent
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    throw new Error(`Could not resolve Nojo projects root (searched for projects/nojo under ${process.cwd()}).`);
  })();

  return nojoProjectsRootPromise;
}

async function loadNojoDoc(docFile: NojoDocFile): Promise<string> {
  const cached = docTextCache.get(docFile);
  if (cached) return cached;

  const root = await resolveNojoProjectsRoot();
  const fullPath = path.join(root, docFile);
  const text = await fs.readFile(fullPath, "utf8");
  docTextCache.set(docFile, text);
  return text;
}

function pickOptionalDocsForPrompt(prompt: string): NojoDocFile[] {
  const lower = prompt.toLowerCase();

  const wantsDecisions =
    /decision|rationale|trade[- ]?off|architecture|principle|constraints|dd|d[0-9]/i.test(lower);
  const wantsRoadmap = /roadmap|milestone|timeline|phase|milestones?/i.test(lower);
  const wantsProduct = /product|what is nojo|purpose|how it works|openclaw|runtime/i.test(lower);
  const wantsProjectOverview = /project context|background|overview|scope/i.test(lower);

  const optional: NojoDocFile[] = [];
  if (wantsDecisions) optional.push(NOJO_DOC_FILES.DECISIONS);
  if (wantsRoadmap) optional.push(NOJO_DOC_FILES.ROADMAP);
  if (wantsProduct) optional.push(NOJO_DOC_FILES.PRODUCT);
  if (wantsProjectOverview) optional.push(NOJO_DOC_FILES.PROJECT_CONTEXT);

  return optional;
}

async function buildNojoProductSharedBlocks(rawPrompt: string): Promise<{
  sharedBlock: string;
  injectedDocs: NojoDocFile[];
}> {
  const injectedDocs: NojoDocFile[] = [
    NOJO_DOC_FILES.ACTIVE_CONTEXT,
    NOJO_DOC_FILES.BRAND_VOICE,
  ];
  injectedDocs.push(...pickOptionalDocsForPrompt(rawPrompt));

  const docsContents = await Promise.all(injectedDocs.map(loadNojoDoc));
  const [active, brand, ...optionalContents] = docsContents;
  const optionalDocs = injectedDocs.slice(2);

  const docBlocks: string[] = [];
  docBlocks.push(`---\n${NOJO_DOC_FILES.ACTIVE_CONTEXT}\n---\n${active.trim()}`);
  docBlocks.push(`---\n${NOJO_DOC_FILES.BRAND_VOICE}\n---\n${brand.trim()}`);

  for (let i = 0; i < optionalDocs.length; i++) {
    docBlocks.push(
      `---\n${optionalDocs[i]}\n---\n${String(optionalContents[i] ?? "").trim()}`,
    );
  }

  const lower = rawPrompt.toLowerCase();
  const wantsDurableExportContract =
    /resume|cv|curriculum vitae|job\b|job hunting|job-hunt|export|download|document generation|docx|rtf|pdf|doc\b/i.test(
      lower,
    );

  if (wantsDurableExportContract) {
    docBlocks.push(
      `---\nNOJO_DURABLE_FILES_EXPORT_CONTRACT\n---\n${[
        "When you generate user-visible files (resumes, cover letters, job-search exports, DOCX/PDF/RTF/etc.), you MUST follow this contract:",
        "",
        "1) Canonical persistence signal",
        "- The platform will only treat a file as saved when it is persisted through Nojo Durable Files.",
        "- You must NOT claim success based on runtime/local filesystem paths (e.g. anything like projects/..., ./..., /workspace/..., or D:/.../agent/runtime/... ).",
        "",
        "2) Emit structured file artifacts (required)",
        "- When exporting each file, include a structured artifact descriptor object (not just a path string).",
        "- Your artifact descriptor MUST include: filename plus ONE of: bytesBase64 OR contentText OR tempPath.",
        "- Optionally include `mimeType`.",
        "",
        "3) Where to put artifacts (required)",
        "- Include the artifact descriptor under one of these top-level keys in your tool/output payload:",
        "  - `attachments` (array) OR `files` (array) OR `artifacts` (array) OR `generatedFiles` (array)",
        "",
        "4) User-facing success messaging",
        "- Do NOT output any filesystem paths as if they were the saved location.",
        "- You can say something like: “Saved to your Files.” The UI will add the canonical saved filename after Durable Files persistence completes.",
        "",
        "If you cannot provide structured artifacts, do not claim success for file exports.",
      ].join("\n")}`,
    );
  }

  return { sharedBlock: docBlocks.join("\n\n"), injectedDocs };
}

// Build the read-only shared context block for Nojo agents.
// This is intentionally limited to reduce prompt bloat and avoid “personality bleed”.
export async function composeNojoSharedContextPrompt(opts: {
  agentId: string | undefined | null;
  prompt: string;
  /** When true, inject repo IDENTITY/SOUL so the model is role-aware even if runtime workspace lags. */
  isFirstUserMessage?: boolean;
  /** Required to inject DB-backed identity for `nojo-team-*` agents. */
  userId?: string | null;
}): Promise<{
  composedPrompt: string;
  injectedDocs: NojoDocFile[];
  isNojoAgent: boolean;
  firstTurnIdentityFallbackApplied: boolean;
}> {
  const rawPrompt = typeof opts.prompt === "string" ? opts.prompt.trim() : "";
  const agentId = typeof opts.agentId === "string" ? opts.agentId : undefined;
  const isFirstUserMessage = opts.isFirstUserMessage === true;
  const userId = typeof opts.userId === "string" && opts.userId.trim() !== "" ? opts.userId.trim() : undefined;

  if (!rawPrompt) {
    return { composedPrompt: "", injectedDocs: [], isNojoAgent: false, firstTurnIdentityFallbackApplied: false };
  }

  if (agentId && isUserCreatedWorkspaceAgentId(agentId) && userId) {
    const row = await prisma.userWorkspaceAgent.findUnique({
      where: { userId_agentId: { userId, agentId } },
    });
    if (!row) {
      return { composedPrompt: rawPrompt, injectedDocs: [], isNojoAgent: false, firstTurnIdentityFallbackApplied: false };
    }

    const input = userWorkspaceIdentityInputFromRow(row);
    const { sharedBlock, injectedDocs } = await buildNojoProductSharedBlocks(rawPrompt);

    const bundled = bundledSkillEntriesForSkillIds(input.identity?.assignedSkillIds);
    const bundledPaths =
      bundled.length > 0
        ? bundled.map((b) => `skills/${b.contentSlug}/SKILL.md`).join(", ")
        : null;

    const teamInstructions = [
      `NOJO_USER_WORKSPACE_AGENT:`,
      `You are a user-defined workspace agent. Use NOJO_SHARED_CONTEXT for product facts and brand tone.`,
      `Stay in character per your IDENTITY/SOUL in the fallback block below; do not ask the user to pick your name, creature type, emoji, or vibe unless they explicitly want to change settings.`,
      `Do not use a generic “just came online / who am I?” bootstrap — identity is already defined.`,
      `Memory is scoped to the current agentId.`,
      `If NOJO_SCHEDULED_REMINDERS appears in the prompt, the server already registered those times on the OpenClaw Gateway cron scheduler — confirm them; do not claim timed reminders are impossible or tell the user to use only a phone or calendar.`,
      bundledPaths
        ? `Bundled skill packs (read SKILL.md under each path first; references in skills/<slug>/references/): ${bundledPaths}`
        : null,
    ]
      .filter((x): x is string => x != null)
      .join(" ");

    let firstTurnIdentityFallbackApplied = false;
    let identityFallbackBlock: string | null = null;
    if (isFirstUserMessage) {
      identityFallbackBlock = buildUserWorkspaceFirstTurnFallbackBlock(input);
      firstTurnIdentityFallbackApplied =
        identityFallbackBlock != null && identityFallbackBlock.length > 0;
    }

    const composedPrompt = [
      teamInstructions,
      "",
      sharedBlock,
      ...(identityFallbackBlock ? ["", identityFallbackBlock, ""] : [""]),
      "User request:",
      rawPrompt,
    ].join("\n");

    return { composedPrompt, injectedDocs, isNojoAgent: true, firstTurnIdentityFallbackApplied };
  }

  if (!isNojoAgentId(agentId)) {
    // Do not inject Nojo shared docs into non-Nojo/personal/general agents.
    return { composedPrompt: rawPrompt, injectedDocs: [], isNojoAgent: false, firstTurnIdentityFallbackApplied: false };
  }

  const { sharedBlock, injectedDocs } = await buildNojoProductSharedBlocks(rawPrompt);

  const baseInstructions = [
    `NOJO_SHARED_CONTEXT (read-only reference).`,
    `Use this for product facts, decisions, roadmap, and brand tone constraints.`,
    `Do NOT adopt or copy any other agent identity/personality. Memory is scoped to the current agentId.`,
    `If something is missing or uncertain, ask clarifying questions instead of inventing facts.`,
    `If NOJO_SCHEDULED_REMINDERS appears in the prompt, the server already created OpenClaw cron jobs for those times — confirm them; do not tell the user a timed reminder can only be done outside the app.`,
  ].join(" ");

  const supportRoleInstructions =
    agentId === "nojo-support"
      ? [
          `NOJO_SUPPORT_ROLE:`,
          `Shared docs describe the Nojo platform so you can help customers (workspace owners and their teams) use it successfully.`,
          `Do not present as Nojo corporate/internal support or "the Nojo product team" unless the user explicitly asks about the vendor.`,
          `Without account/company details in this prompt, use generic phrasing: your workspace, your team, your account, your request or issue.`,
          `When optional customer-account context appears in the prompt (e.g. company or workspace name), use it to personalize; otherwise do not invent names or organizations.`,
        ].join(" ")
      : "";

  const instructions = [baseInstructions, supportRoleInstructions].filter(Boolean).join("\n\n");

  let firstTurnIdentityFallbackApplied = false;
  let identityFallbackBlock: string | null = null;
  if (
    isFirstUserMessage &&
    isNojoFirstTurnIdentityFallbackEnabled() &&
    isNojoAgentId(agentId)
  ) {
    identityFallbackBlock = await loadRepoFirstTurnIdentityFallback(agentId);
    firstTurnIdentityFallbackApplied = identityFallbackBlock != null && identityFallbackBlock.length > 0;
  }

  const composedPrompt = [
    instructions,
    "",
    sharedBlock,
    ...(identityFallbackBlock
      ? ["", identityFallbackBlock, ""]
      : [""]),
    "User request:",
    rawPrompt,
  ].join("\n");

  return { composedPrompt, injectedDocs, isNojoAgent: true, firstTurnIdentityFallbackApplied };
}

export function getNojoAgentIds(): string[] {
  return Array.from(NOJO_AGENT_IDS.values());
}

