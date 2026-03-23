import path from "node:path";
import { promises as fs } from "node:fs";
import crypto from "node:crypto";

import { assertExtensionUploadAllowed, resolveAllowedExtensionInfo } from "./nojoFileTypes";

export const NOJO_FILES_ROOT_ENV = "NOJO_FILES_ROOT";

function isSafeIdSegment(seg: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(seg);
}

export async function resolveNojoFilesRoot(): Promise<string> {
  const configured = process.env[NOJO_FILES_ROOT_ENV];
  const candidate = configured && configured.trim() ? configured.trim() : null;
  const rootAbs = path.resolve(candidate ?? path.join(process.cwd(), "nojo-files"));
  await fs.mkdir(rootAbs, { recursive: true });
  return rootAbs;
}

export function buildRevisionStorageKey(opts: {
  userId: string;
  projectId: string;
  projectFileId: string;
  revisionId: string;
  extension: string | null;
}): string {
  const { userId, projectId, projectFileId, revisionId } = opts;
  if (![userId, projectId, projectFileId, revisionId].every(isSafeIdSegment)) {
    throw new Error("Invalid id segment.");
  }

  const ext = assertExtensionUploadAllowed(opts.extension);
  // Extension becomes part of the blob name. Bytes are served with mimeType from DB.
  return path.join(userId, projectId, projectFileId, "revisions", `${revisionId}.${ext}`);
}

export function resolveStorageAbsPath(opts: { rootAbs: string; storageKey: string }): string {
  const { rootAbs, storageKey } = opts;

  // Normalize to an absolute path, then ensure it stays under root.
  const root = path.resolve(rootAbs);
  const abs = path.resolve(root, storageKey);

  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (!abs.startsWith(rootWithSep)) {
    throw new Error("Resolved path is outside storage root.");
  }

  return abs;
}

export function randomRevisionId(): string {
  // Used for tests / optional pre-create flows. Prisma still creates the canonical id.
  return crypto.randomBytes(16).toString("hex");
}

export async function writeRevisionBytesToDisk(opts: {
  rootAbs: string;
  storageKey: string;
  bytes: Buffer;
}) {
  const absPath = resolveStorageAbsPath({
    rootAbs: opts.rootAbs,
    storageKey: opts.storageKey,
  });
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, opts.bytes);
  return { absPath };
}

export function getDisplayFilename(opts: { originalFilename: string }): {
  sanitizedFilename: string;
  extension: string | null;
} {
  const { originalFilename } = opts;
  const base = path.basename(originalFilename);

  // Normalize base name: keep only safe characters and cap length.
  const ext = path.extname(base);
  const extNorm = ext ? ext.slice(1).toLowerCase() : null;
  const baseWithoutExt = ext ? base.slice(0, -ext.length) : base;

  const sanitizedBase = baseWithoutExt
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

  const finalBase = sanitizedBase || "file";
  const extension = extNorm ? resolveAllowedExtensionInfo(extNorm).extension : null;

  const sanitizedFilename = extension ? `${finalBase}.${extension}` : finalBase;
  return { sanitizedFilename, extension };
}

