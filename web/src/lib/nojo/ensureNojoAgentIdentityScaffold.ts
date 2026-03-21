import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { getConfiguredRuntimeAgentsRoot } from "@/lib/openclaw/openClawRuntimeRoot";
import { resolveRepoNojoAgentTemplateRoot } from "./nojoAgentRepoPaths";
import type {
  NojoAgentIdentityScaffoldResult,
  NovaContentQaPayload,
  RuntimeFileSnapshotEntry,
  ScaffoldFileReport,
} from "./nojoScaffoldQaTypes";
import { getNojoAgentIds } from "./nojoSharedContext";

export const SCAFFOLD_FILES = ["IDENTITY.md", "SOUL.md", "USER.md", "MEMORY.md", "AGENTS.md"] as const;

export type {
  NojoAgentIdentityScaffoldResult,
  NovaContentQaPayload,
  RuntimeFileSnapshotEntry,
  ScaffoldFileOutcome,
  ScaffoldFileReport,
} from "./nojoScaffoldQaTypes";

function sha256Hex(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
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

export async function ensureNojoAgentIdentityScaffold(opts: {
  agentId: string | undefined | null;
}): Promise<NojoAgentIdentityScaffoldResult> {
  const agentId = typeof opts.agentId === "string" ? opts.agentId.trim() : "";
  if (!agentId || !getNojoAgentIds().includes(agentId)) {
    return { ...EMPTY_SCAFFOLD };
  }

  const configuredAgentsRoot = path.resolve(getConfiguredRuntimeAgentsRoot());
  const templateRootResolved = path.resolve(await resolveRepoNojoAgentTemplateRoot(agentId));
  const runtimeWorkspace = path.join(configuredAgentsRoot, agentId, "workspace");
  const runtimeWorkspaceAbsPath = path.resolve(runtimeWorkspace);
  await fs.mkdir(runtimeWorkspace, { recursive: true });

  const seededFiles: string[] = [];
  const preExistingNonEmptyFiles: string[] = [];
  const fileReports: ScaffoldFileReport[] = [];

  for (const fileName of SCAFFOLD_FILES) {
    const target = path.join(runtimeWorkspace, fileName);
    const keepExisting = await hasNonEmptyFile(target);
    if (keepExisting) {
      preExistingNonEmptyFiles.push(fileName);
      fileReports.push({ fileName, outcome: "pre_existing_non_empty" });
      continue;
    }

    const source = path.join(templateRootResolved, fileName);
    let sourceText: string;
    try {
      sourceText = await fs.readFile(source, "utf8");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "ENOENT") {
        fileReports.push({ fileName, outcome: "template_missing" });
        console.warn("[nojo.scaffold]", {
          agentId,
          fileName,
          outcome: "template_missing",
          source,
        });
      } else {
        const detail = err instanceof Error ? err.message : String(err);
        fileReports.push({ fileName, outcome: "io_error", detail });
        console.warn("[nojo.scaffold]", {
          agentId,
          fileName,
          outcome: "io_error",
          phase: "read_template",
          detail,
        });
      }
      continue;
    }

    if (!sourceText.trim()) {
      fileReports.push({ fileName, outcome: "template_empty" });
      continue;
    }

    try {
      await fs.writeFile(target, sourceText, "utf8");
      seededFiles.push(fileName);
      fileReports.push({ fileName, outcome: "seeded" });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      fileReports.push({ fileName, outcome: "io_error", detail });
      console.warn("[nojo.scaffold]", {
        agentId,
        fileName,
        outcome: "io_error",
        phase: "write_runtime",
        detail,
      });
    }
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
    templateRootResolved,
    fileReports,
    runtimeFileSnapshot,
    runtimeIdentityFingerprint,
    genericFallbackRisk,
  };
}

export function buildNovaContentQaPayload(
  scaffold: NojoAgentIdentityScaffoldResult,
): NovaContentQaPayload {
  return {
    routedToNojoContent: true,
    runtimeWorkspaceAbsPath: scaffold.runtimeWorkspaceAbsPath,
    scaffoldSkippedBecauseFilesExist: scaffold.scaffoldSkippedBecauseFilesExist,
    preExistingNonEmptyFiles: scaffold.preExistingNonEmptyFiles,
    seededFiles: scaffold.seededFiles,
    configuredAgentsRoot: scaffold.configuredAgentsRoot,
    templateRootResolved: scaffold.templateRootResolved,
    fileReports: scaffold.fileReports,
    runtimeFileSnapshot: scaffold.runtimeFileSnapshot,
    runtimeIdentityFingerprint: scaffold.runtimeIdentityFingerprint,
    genericFallbackRisk: scaffold.genericFallbackRisk,
  };
}
