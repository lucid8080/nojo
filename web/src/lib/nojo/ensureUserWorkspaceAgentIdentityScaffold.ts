import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type { UserWorkspaceAgent } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getConfiguredRuntimeAgentsRoot } from "@/lib/openclaw/openClawRuntimeRoot";
import { isUserCreatedWorkspaceAgentId } from "@/lib/workspace/userWorkspaceAgentServer";

import { SCAFFOLD_FILES } from "./ensureNojoAgentIdentityScaffold";
import type {
  NojoAgentIdentityScaffoldResult,
  RuntimeFileSnapshotEntry,
  ScaffoldFileReport,
} from "./nojoScaffoldQaTypes";
import { syncBundledSkillPacksToWorkspace } from "./bundledSkillsRuntimeSync";
import {
  buildUserWorkspaceAgentsMd,
  buildUserWorkspaceIdentityMd,
  buildUserWorkspaceMemoryMd,
  buildUserWorkspaceSoulMd,
  buildUserWorkspaceUserMd,
  fingerprintUserWorkspaceIdentity,
  userWorkspaceIdentityInputFromRow,
} from "./userWorkspaceAgentIdentityMarkdown";

const FINGERPRINT_FILE = ".nojo-user-agent-identity-fingerprint";

function sha256Hex(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function hasNonEmptyFile(filePath: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw.trim().length > 0;
  } catch {
    return false;
  }
}

async function snapshotRuntimeFile(absPath: string): Promise<RuntimeFileSnapshotEntry> {
  try {
    const buf = await fs.readFile(absPath);
    return { exists: true, byteLength: buf.length, sha256: sha256Hex(buf) };
  } catch {
    return { exists: false, byteLength: 0, sha256: "" };
  }
}

async function buildRuntimeSnapshots(
  runtimeWorkspace: string,
): Promise<Record<string, RuntimeFileSnapshotEntry>> {
  const out: Record<string, RuntimeFileSnapshotEntry> = {};
  for (const fileName of SCAFFOLD_FILES) {
    out[fileName] = await snapshotRuntimeFile(path.join(runtimeWorkspace, fileName));
  }
  return out;
}

async function computeRuntimeIdentityFingerprint(
  runtimeWorkspace: string,
): Promise<{ fingerprint: string; genericFallbackRisk: boolean }> {
  const idPath = path.join(runtimeWorkspace, "IDENTITY.md");
  const soulPath = path.join(runtimeWorkspace, "SOUL.md");
  let idBuf = Buffer.alloc(0);
  let soulBuf = Buffer.alloc(0);
  try {
    idBuf = await fs.readFile(idPath);
  } catch {
    // missing
  }
  try {
    soulBuf = await fs.readFile(soulPath);
  } catch {
    // missing
  }
  const genericFallbackRisk = idBuf.length === 0;
  if (idBuf.length === 0 && soulBuf.length === 0) {
    return { fingerprint: "", genericFallbackRisk: true };
  }
  const combined = Buffer.concat([idBuf, Buffer.from("|", "utf8"), soulBuf]);
  return { fingerprint: sha256Hex(combined), genericFallbackRisk };
}

const EMPTY_SCAFFOLD: NojoAgentIdentityScaffoldResult = {
  seeded: false,
  seededFiles: [],
  scaffoldSkippedBecauseFilesExist: false,
  runtimeWorkspaceAbsPath: "",
  preExistingNonEmptyFiles: [],
  configuredAgentsRoot: "",
  templateRootResolved: "",
  fileReports: [],
  runtimeFileSnapshot: {},
  runtimeIdentityFingerprint: "",
  genericFallbackRisk: false,
};

export function rowToUserWorkspaceIdentityInput(row: UserWorkspaceAgent) {
  return userWorkspaceIdentityInputFromRow(row);
}

export async function ensureUserWorkspaceAgentIdentityScaffold(opts: {
  userId: string | undefined | null;
  agentId: string | undefined | null;
}): Promise<NojoAgentIdentityScaffoldResult> {
  const userId = typeof opts.userId === "string" ? opts.userId.trim() : "";
  const agentId = typeof opts.agentId === "string" ? opts.agentId.trim() : "";
  if (!userId || !agentId || !isUserCreatedWorkspaceAgentId(agentId)) {
    return { ...EMPTY_SCAFFOLD };
  }

  const row = await prisma.userWorkspaceAgent.findUnique({
    where: { userId_agentId: { userId, agentId } },
  });
  if (!row) {
    return { ...EMPTY_SCAFFOLD };
  }

  const input = rowToUserWorkspaceIdentityInput(row);
  const identityFp = sha256Hex(fingerprintUserWorkspaceIdentity(input));

  const configuredAgentsRoot = path.resolve(getConfiguredRuntimeAgentsRoot());
  const runtimeWorkspace = path.join(configuredAgentsRoot, agentId, "workspace");
  const runtimeWorkspaceAbsPath = path.resolve(runtimeWorkspace);
  await fs.mkdir(runtimeWorkspace, { recursive: true });

  const fingerprintPath = path.join(runtimeWorkspace, FINGERPRINT_FILE);
  let storedFp = "";
  try {
    storedFp = (await fs.readFile(fingerprintPath, "utf8")).trim();
  } catch {
    storedFp = "";
  }

  const identityEmpty = !(await hasNonEmptyFile(path.join(runtimeWorkspace, "IDENTITY.md")));
  const needsWrite = storedFp !== identityFp || identityEmpty;

  const seededFiles: string[] = [];
  const preExistingNonEmptyFiles: string[] = [];
  const fileReports: ScaffoldFileReport[] = [];

  const contentByFile: Record<(typeof SCAFFOLD_FILES)[number], string> = {
    "IDENTITY.md": buildUserWorkspaceIdentityMd(input),
    "SOUL.md": buildUserWorkspaceSoulMd(input),
    "USER.md": buildUserWorkspaceUserMd(input),
    "MEMORY.md": buildUserWorkspaceMemoryMd(input),
    "AGENTS.md": buildUserWorkspaceAgentsMd(input),
  };

  if (needsWrite) {
    for (const fileName of SCAFFOLD_FILES) {
      const target = path.join(runtimeWorkspace, fileName);
      const text = contentByFile[fileName];
      try {
        await fs.writeFile(target, text, "utf8");
        seededFiles.push(fileName);
        fileReports.push({ fileName, outcome: "seeded" });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        fileReports.push({ fileName, outcome: "io_error", detail });
        console.warn("[nojo.scaffold.team]", { agentId, fileName, detail });
      }
    }
    try {
      await fs.writeFile(fingerprintPath, identityFp, "utf8");
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.warn("[nojo.scaffold.team]", { agentId, file: FINGERPRINT_FILE, detail });
    }
  } else {
    for (const fileName of SCAFFOLD_FILES) {
      const target = path.join(runtimeWorkspace, fileName);
      if (await hasNonEmptyFile(target)) {
        preExistingNonEmptyFiles.push(fileName);
        fileReports.push({ fileName, outcome: "pre_existing_non_empty" });
      } else {
        const text = contentByFile[fileName];
        try {
          await fs.writeFile(target, text, "utf8");
          seededFiles.push(fileName);
          fileReports.push({ fileName, outcome: "seeded" });
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          fileReports.push({ fileName, outcome: "io_error", detail });
        }
      }
    }
  }

  const assignedSkillIds = input.identity?.assignedSkillIds ?? [];
  const skillSync = await syncBundledSkillPacksToWorkspace({
    runtimeWorkspaceAbsPath,
    skillIds: assignedSkillIds,
  });
  if (skillSync.errors.length) {
    console.warn("[nojo.scaffold.team.bundledSkills]", {
      agentId,
      errors: skillSync.errors,
      repoSkillsRoot: skillSync.repoSkillsRoot,
    });
  }

  const seeded = seededFiles.length > 0;
  const scaffoldSkippedBecauseFilesExist =
    !seeded && preExistingNonEmptyFiles.length === SCAFFOLD_FILES.length;

  const runtimeFileSnapshot = await buildRuntimeSnapshots(runtimeWorkspace);
  const { fingerprint: runtimeIdentityFingerprint, genericFallbackRisk } =
    await computeRuntimeIdentityFingerprint(runtimeWorkspace);

  return {
    seeded,
    seededFiles,
    scaffoldSkippedBecauseFilesExist,
    runtimeWorkspaceAbsPath,
    preExistingNonEmptyFiles,
    configuredAgentsRoot,
    templateRootResolved: "user-workspace-agent-generated",
    fileReports,
    runtimeFileSnapshot,
    runtimeIdentityFingerprint,
    genericFallbackRisk,
  };
}
