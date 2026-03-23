import type { Project, ProjectFile, FileRevision } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function requireProjectOwnedByUser(params: {
  userId: string;
  projectId: string;
}): Promise<Project> {
  const { userId, projectId } = params;
  const row = await prisma.project.findFirst({
    where: { id: projectId, ownerUserId: userId },
  });
  if (!row) {
    throw new Error("Project not found.");
  }
  return row;
}

export async function requireProjectFileOwnedByUser(params: {
  userId: string;
  projectFileId: string;
}): Promise<ProjectFile> {
  const { userId, projectFileId } = params;
  const row = await prisma.projectFile.findFirst({
    where: { id: projectFileId, ownerUserId: userId },
  });
  if (!row) {
    throw new Error("File not found.");
  }
  return row;
}

export async function requireRevisionOwnedByUser(params: {
  userId: string;
  revisionId: string;
}): Promise<FileRevision> {
  const { userId, revisionId } = params;
  const row = await prisma.fileRevision.findFirst({
    where: { id: revisionId, projectFile: { ownerUserId: userId } },
  });
  if (!row) {
    throw new Error("Revision not found.");
  }
  return row;
}

