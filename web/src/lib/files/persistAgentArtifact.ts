import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import type { ProjectFile, FileRevision } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireProjectOwnedByUser } from "@/lib/files/nojoFileAuth";
import {
  buildRevisionStorageKey,
  getDisplayFilename,
  randomRevisionId,
  resolveNojoFilesRoot,
  writeRevisionBytesToDisk,
} from "@/lib/files/nojoFileStorage";
import {
  assertExtensionUploadAllowed,
  assertAgentExtensionUploadAllowed,
  resolveMimeTypeForExtension,
} from "@/lib/files/nojoFileTypes";

export type PersistAgentArtifactCreatedByType = "agent" | "user";

export type PersistAgentArtifactParams = {
  userId: string;
  projectId: string;

  /**
   * User-visible filename that should become the durable file's identity/display name.
   * We sanitize this server-side before persisting.
   */
  filename: string;

  /**
   * When set, the revision will be appended to this existing durable file record
   * (and the helper will not attempt to reuse files by filename).
   */
  projectFileId?: string;

  /**
   * When true, always create a new durable file record (even if a non-archived
   * file with the same sanitized filename already exists).
   */
  forceNewFile?: boolean;

  /**
   * Provide bytes directly (preferred for MVP correctness).
   * Exactly one of `bytes` or `tempPath` must be provided.
   */
  bytes?: Buffer;
  /**
   * Optional: tempPath under the agent/runtime workspace that we can read server-side.
   * This is only safe when the tempPath is validated to be under `runtimeWorkspaceAbsPath`.
   */
  tempPath?: string;
  /**
   * Required when using `tempPath` (used for traversal protection).
   */
  runtimeWorkspaceAbsPath?: string;

  /**
   * Optional: a short change summary for the revision row.
   */
  changeSummary?: string | null;

  createdByType?: PersistAgentArtifactCreatedByType;
  createdByAgentId?: string | null;
};

export type PersistAgentArtifactResult = {
  file: ProjectFile & { currentRevision: FileRevision | null };
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function resolveCreatedByType(createdByType?: PersistAgentArtifactCreatedByType): "USER" | "AGENT" {
  if (createdByType === "user") return "USER";
  return "AGENT";
}

function normalizeChangeSummary(changeSummary?: string | null): string | null {
  if (typeof changeSummary !== "string") return null;
  const trimmed = changeSummary.trim();
  return trimmed.length ? trimmed : null;
}

export function resolveSafeTempArtifactAbsPath(opts: {
  runtimeWorkspaceAbsPath: string;
  tempPath: string;
}): string {
  const { runtimeWorkspaceAbsPath, tempPath } = opts;
  if (!runtimeWorkspaceAbsPath || !runtimeWorkspaceAbsPath.trim()) {
    throw new Error("runtimeWorkspaceAbsPath is required for tempPath reads.");
  }
  if (!isNonEmptyString(tempPath)) {
    throw new Error("tempPath must be a non-empty string.");
  }

  // Support both relative and absolute temp paths, but always enforce the
  // resolved absolute path is under the runtime workspace.
  const rootAbs = path.resolve(runtimeWorkspaceAbsPath);
  const abs = path.isAbsolute(tempPath) ? path.resolve(tempPath) : path.resolve(rootAbs, tempPath);

  const rootWithSep = rootAbs.endsWith(path.sep) ? rootAbs : `${rootAbs}${path.sep}`;
  if (!abs.startsWith(rootWithSep) && abs !== rootAbs) {
    throw new Error("Resolved tempPath is outside runtime workspace root.");
  }
  return abs;
}

export async function persistAgentArtifact(
  params: PersistAgentArtifactParams,
): Promise<PersistAgentArtifactResult> {
  const {
    userId,
    projectId,
    filename,
    projectFileId: projectFileIdInput,
    forceNewFile,
    bytes,
    tempPath,
    runtimeWorkspaceAbsPath,
    changeSummary,
    createdByType,
    createdByAgentId,
  } = params;

  const createdByTypeFinal = resolveCreatedByType(createdByType);
  const createdByAgentIdFinal =
    createdByTypeFinal === "AGENT" && isNonEmptyString(createdByAgentId) ? createdByAgentId!.trim() : null;

  if (!isNonEmptyString(filename)) throw new Error("filename is required.");

  // Enforce project ownership + existence early.
  await requireProjectOwnedByUser({ userId, projectId });

  let bytesResolved: Buffer | null = null;
  if (Buffer.isBuffer(bytes)) {
    bytesResolved = bytes;
  } else if (tempPath) {
    const abs = resolveSafeTempArtifactAbsPath({
      runtimeWorkspaceAbsPath: runtimeWorkspaceAbsPath ?? "",
      tempPath,
    });
    bytesResolved = await fs.readFile(abs);
  }

  if (!bytesResolved) {
    throw new Error("Provide either `bytes` or `tempPath`.");
  }

  if (bytesResolved.byteLength <= 0) {
    throw new Error("Refusing to persist empty bytes.");
  }

  // Sanitize display filename + derive extension.
  const { sanitizedFilename, extension } = getDisplayFilename({ originalFilename: filename });
  const extValidated =
    createdByTypeFinal === "AGENT"
      ? assertAgentExtensionUploadAllowed(extension)
      : assertExtensionUploadAllowed(extension);
  const mimeType = resolveMimeTypeForExtension(extValidated);
  const sizeBytes = bytesResolved.byteLength;

  const rootAbs = await resolveNojoFilesRoot();

  const changeSummaryFinal = normalizeChangeSummary(changeSummary);

  // Reuse logical file identity by sanitized filename (within a project).
  let projectFileId: string;
  let isNew: boolean;

  if (projectFileIdInput) {
    const existingById = await prisma.projectFile.findFirst({
      where: {
        id: projectFileIdInput,
        projectId,
        ownerUserId: userId,
        archivedAt: null,
      },
      select: { id: true },
    });
    if (!existingById) {
      throw new Error("File not found.");
    }
    projectFileId = existingById.id;
    isNew = false;
  } else if (forceNewFile) {
    projectFileId = randomRevisionId();
    isNew = true;
  } else {
    const existing = await prisma.projectFile.findFirst({
      where: {
        projectId,
        ownerUserId: userId,
        archivedAt: null,
        filename: sanitizedFilename,
      },
      select: {
        id: true,
        currentRevisionId: true,
      },
    });

    projectFileId = existing?.id ?? randomRevisionId();
    isNew = !existing;
  }

  const revisionId = randomRevisionId();
  const storageKey = buildRevisionStorageKey({
    userId,
    projectId,
    projectFileId,
    revisionId,
    extension: extension,
  });

  // Write bytes first; if DB fails, we may leave an orphan (MVP limitation).
  await writeRevisionBytesToDisk({
    rootAbs,
    storageKey,
    bytes: bytesResolved,
  });

  await prisma.$transaction(async (tx) => {
    if (isNew) {
      await tx.projectFile.create({
        data: {
          id: projectFileId,
          projectId,
          ownerUserId: userId,
          filename: sanitizedFilename,
          mimeType,
          extension,
          sizeBytes,
          currentRevisionId: null,
          createdByType: createdByTypeFinal,
          createdByUserId: createdByTypeFinal === "USER" ? userId : null,
          createdByAgentId: createdByTypeFinal === "AGENT" ? createdByAgentIdFinal : null,
        },
      });
    }

    const last = await tx.fileRevision.findFirst({
      where: { projectFileId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    const nextVersionNumber = last ? last.versionNumber + 1 : 1;

    await tx.fileRevision.create({
      data: {
        id: revisionId,
        projectFileId,
        versionNumber: nextVersionNumber,
        storageKey,
        mimeType,
        sizeBytes,
        changeSummary: changeSummaryFinal,
        createdByType: createdByTypeFinal,
        createdByUserId: createdByTypeFinal === "USER" ? userId : null,
        createdByAgentId: createdByTypeFinal === "AGENT" ? createdByAgentIdFinal : null,
      },
    });

    await tx.projectFile.update({
      where: { id: projectFileId },
      data: {
        currentRevisionId: revisionId,
        filename: sanitizedFilename,
        mimeType,
        extension,
        sizeBytes,
      },
    });
  });

  const file = await prisma.projectFile.findUnique({
    where: { id: projectFileId },
    include: { currentRevision: true },
  });

  if (!file) {
    throw new Error("Durable file record missing after persistence.");
  }

  return { file };
}

