import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { describe, expect, it, beforeEach, afterEach, vi, beforeAll } from "vitest";

import type { PersistAgentArtifactParams } from "./persistAgentArtifact";

type InMemoryProject = { id: string; ownerUserId: string; name: string; description?: string | null };
type InMemoryProjectFile = {
  id: string;
  projectId: string;
  ownerUserId: string;
  filename: string;
  mimeType: string;
  extension: string | null;
  sizeBytes: number;
  currentRevisionId: string | null;
  archivedAt: Date | null;
  createdByType: "USER" | "AGENT";
  createdByUserId: string | null;
  createdByAgentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
type InMemoryFileRevision = {
  id: string;
  projectFileId: string;
  versionNumber: number;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  changeSummary: string | null;
  createdByType: "USER" | "AGENT";
  createdByUserId: string | null;
  createdByAgentId: string | null;
  createdAt: Date;
};

const state = {
  projects: [] as InMemoryProject[],
  projectFiles: [] as InMemoryProjectFile[],
  fileRevisions: [] as InMemoryFileRevision[],
};

function resetState() {
  state.projects = [];
  state.projectFiles = [];
  state.fileRevisions = [];
}

function getProjectFile(fileId: string) {
  return state.projectFiles.find((f) => f.id === fileId) ?? null;
}

function getCurrentRevisionForProjectFile(fileId: string) {
  const f = getProjectFile(fileId);
  if (!f?.currentRevisionId) return null;
  return state.fileRevisions.find((r) => r.id === f.currentRevisionId) ?? null;
}

const mockPrisma = {
  project: {
    findFirst: vi.fn(async (args: any) => {
      const { id, ownerUserId } = args.where ?? {};
      return state.projects.find((p) => p.id === id && p.ownerUserId === ownerUserId) ?? null;
    }),
  },
  projectFile: {
    findFirst: vi.fn(async (args: any) => {
      const where = args.where ?? {};
      const matches = state.projectFiles.filter((f) => {
        if (where.id && f.id !== where.id) return false;
        if (where.projectId && f.projectId !== where.projectId) return false;
        if (where.ownerUserId && f.ownerUserId !== where.ownerUserId) return false;
        if (typeof where.archivedAt !== "undefined") {
          // In Prisma, archivedAt is nullable. We only care about the null case.
          if (where.archivedAt === null && f.archivedAt !== null) return false;
          if (where.archivedAt !== null && f.archivedAt !== where.archivedAt) return false;
        }
        if (where.filename && f.filename !== where.filename) return false;
        return true;
      });
      const row = matches[0] ?? null;
      if (!row) return null;
      if (args.select) {
        const picked: Record<string, unknown> = {};
        for (const k of Object.keys(args.select)) {
          if (args.select[k]) picked[k] = (row as any)[k];
        }
        return picked;
      }
      return row;
    }),
    create: vi.fn(async (args: any) => {
      const d = args.data;
      const row: InMemoryProjectFile = {
        id: d.id,
        projectId: d.projectId,
        ownerUserId: d.ownerUserId,
        filename: d.filename,
        mimeType: d.mimeType,
        extension: d.extension ?? null,
        sizeBytes: d.sizeBytes,
        currentRevisionId: d.currentRevisionId ?? null,
        archivedAt: d.archivedAt ?? null,
        createdByType: d.createdByType,
        createdByUserId: d.createdByUserId ?? null,
        createdByAgentId: d.createdByAgentId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      state.projectFiles.push(row);
      return row;
    }),
    update: vi.fn(async (args: any) => {
      const { where, data } = args;
      const f = state.projectFiles.find((x) => x.id === where.id);
      if (!f) throw new Error("Not found");
      if (typeof data.currentRevisionId !== "undefined") f.currentRevisionId = data.currentRevisionId;
      if (typeof data.filename !== "undefined") f.filename = data.filename;
      if (typeof data.mimeType !== "undefined") f.mimeType = data.mimeType;
      if (typeof data.extension !== "undefined") f.extension = data.extension ?? null;
      if (typeof data.sizeBytes !== "undefined") f.sizeBytes = data.sizeBytes;
      f.updatedAt = new Date();
      return f;
    }),
    findUnique: vi.fn(async (args: any) => {
      const id = args.where?.id;
      const f = state.projectFiles.find((x) => x.id === id) ?? null;
      if (!f) return null;

      if (args.include?.currentRevision) {
        const cr = getCurrentRevisionForProjectFile(id);
        return { ...f, currentRevision: cr };
      }

      return f;
    }),
  },
  fileRevision: {
    findFirst: vi.fn(async (args: any) => {
      const where = args.where ?? {};
      let matches = state.fileRevisions.slice();

      if (where.id) matches = matches.filter((r) => r.id === where.id);
      if (where.projectFileId) matches = matches.filter((r) => r.projectFileId === where.projectFileId);

      if (where.projectFile?.ownerUserId) {
        matches = matches.filter((r) => {
          const pf = getProjectFile(r.projectFileId);
          return pf?.ownerUserId === where.projectFile.ownerUserId;
        });
      }

      if (args.orderBy?.versionNumber === "desc") {
        matches.sort((a, b) => b.versionNumber - a.versionNumber);
      }

      const row = matches[0] ?? null;
      if (!row) return null;
      if (args.select) {
        const picked: Record<string, unknown> = {};
        for (const k of Object.keys(args.select)) {
          if (args.select[k]) picked[k] = (row as any)[k];
        }
        return picked;
      }
      return row;
    }),
    create: vi.fn(async (args: any) => {
      const d = args.data;
      const row: InMemoryFileRevision = {
        id: d.id,
        projectFileId: d.projectFileId,
        versionNumber: d.versionNumber,
        storageKey: d.storageKey,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        changeSummary: d.changeSummary ?? null,
        createdByType: d.createdByType,
        createdByUserId: d.createdByUserId ?? null,
        createdByAgentId: d.createdByAgentId ?? null,
        createdAt: new Date(),
      };
      state.fileRevisions.push(row);
      return row;
    }),
  },
  $transaction: vi.fn(async (fn: any) => {
    // For unit tests we don't need real atomicity; we just need compatible delegates.
    const tx = {
      projectFile: mockPrisma.projectFile,
      fileRevision: mockPrisma.fileRevision,
    };
    return fn(tx);
  }),
};

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

describe("persistAgentArtifact", () => {
  const userId = "user_1";
  const projectId = "project_1";
  const filename = "mock_resume_walmart.rtf";

  let root: string;
  let runtimeRoot: string;
  let persistAgentArtifactFn: typeof import("./persistAgentArtifact").persistAgentArtifact;
  let requireProjectFileOwnedByUserFn: typeof import("./nojoFileAuth").requireProjectFileOwnedByUser;
  let requireProjectOwnedByUserFn: typeof import("./nojoFileAuth").requireProjectOwnedByUser;
  let requireRevisionOwnedByUserFn: typeof import("./nojoFileAuth").requireRevisionOwnedByUser;

  beforeAll(async () => {
    const p = await import("./persistAgentArtifact");
    persistAgentArtifactFn = p.persistAgentArtifact;
    const auth = await import("./nojoFileAuth");
    requireProjectFileOwnedByUserFn = auth.requireProjectFileOwnedByUser;
    requireProjectOwnedByUserFn = auth.requireProjectOwnedByUser;
    requireRevisionOwnedByUserFn = auth.requireRevisionOwnedByUser;
  });

  beforeEach(async () => {
    resetState();
    root = path.join(os.tmpdir(), `nojo-files-test-${Date.now()}`);
    runtimeRoot = path.join(root, "runtime-root");
    await fs.mkdir(runtimeRoot, { recursive: true });

    process.env.NOJO_FILES_ROOT = root;

    state.projects.push({
      id: projectId,
      ownerUserId: userId,
      name: "Chat Files",
      description: null,
    });

    // Clear call history between tests.
    mockPrisma.project.findFirst.mockClear();
    mockPrisma.projectFile.findFirst.mockClear();
    mockPrisma.projectFile.create.mockClear();
    mockPrisma.projectFile.update.mockClear();
    mockPrisma.projectFile.findUnique.mockClear();
    mockPrisma.fileRevision.findFirst.mockClear();
    mockPrisma.fileRevision.create.mockClear();
    mockPrisma.$transaction.mockClear();
  });

  afterEach(async () => {
    delete process.env.NOJO_FILES_ROOT;
    await fs.rm(root, { recursive: true, force: true });
  });

  it("creates first revision and updates currentRevisionId", async () => {
    const params: PersistAgentArtifactParams = {
      userId,
      projectId,
      filename,
      bytes: Buffer.from("hello rtf", "utf8"),
      createdByType: "agent",
      createdByAgentId: "nojo-resume",
    };

    const result = await persistAgentArtifactFn(params);

    expect(state.projectFiles).toHaveLength(1);
    expect(state.fileRevisions).toHaveLength(1);
    expect(state.fileRevisions[0].versionNumber).toBe(1);
    expect(state.projectFiles[0].currentRevisionId).toBe(state.fileRevisions[0].id);
    expect(result.file.currentRevision?.id).toBe(state.fileRevisions[0].id);

    // rtf mime mapping (MVP requirement)
    expect(result.file.mimeType).toBe("application/rtf");
  });

  it("appends revision history and advances versionNumber", async () => {
    const params: PersistAgentArtifactParams = {
      userId,
      projectId,
      filename,
      createdByType: "agent",
      createdByAgentId: "nojo-resume",
    };

    await persistAgentArtifactFn({
      ...params,
      bytes: Buffer.from("v1", "utf8"),
    });
    await persistAgentArtifactFn({
      ...params,
      bytes: Buffer.from("v2", "utf8"),
      changeSummary: "second draft",
    });

    expect(state.projectFiles).toHaveLength(1);
    expect(state.fileRevisions).toHaveLength(2);
    expect(state.fileRevisions.map((r) => r.versionNumber)).toEqual([1, 2]);

    const latest = state.fileRevisions[1];
    expect(state.projectFiles[0].currentRevisionId).toBe(latest.id);
  });

  it("enforces project ownership (rejects non-owned project)", async () => {
    await expect(
      persistAgentArtifactFn({
        userId: "user_not_owner",
        projectId,
        filename,
        bytes: Buffer.from("hello", "utf8"),
      }),
    ).rejects.toThrow(/Project not found/i);
  });

  it("prevents temp-path traversal outside runtime workspace root", async () => {
    await expect(
      persistAgentArtifactFn({
        userId,
        projectId,
        filename,
        tempPath: "../evil.txt",
        runtimeWorkspaceAbsPath: runtimeRoot,
        createdByType: "agent",
      }),
    ).rejects.toThrow(/outside runtime workspace root/i);
  });

  it("ownership helpers reject non-owned project/file/revision", async () => {
    // Create a file owned by `userId`.
    const created = await persistAgentArtifactFn({
      userId,
      projectId,
      filename,
      bytes: Buffer.from("hello", "utf8"),
      createdByType: "agent",
      createdByAgentId: "nojo-resume",
    });

    const projectFileId = created.file.id;
    const revisionId = created.file.currentRevision?.id ?? "";

    await expect(
      requireProjectOwnedByUserFn({ userId: "someone_else", projectId }),
    ).rejects.toThrow(/Project not found/i);

    await expect(
      requireProjectFileOwnedByUserFn({ userId: "someone_else", projectFileId }),
    ).rejects.toThrow(/File not found/i);

    await expect(
      requireRevisionOwnedByUserFn({ userId: "someone_else", revisionId }),
    ).rejects.toThrow(/Revision not found/i);
  });
});

