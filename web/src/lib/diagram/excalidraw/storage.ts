import { prisma } from "@/lib/db";
import type { ExcalidrawArtifactFile } from "./types";
import { persistAgentArtifact } from "@/lib/files/persistAgentArtifact";

export type CreateDiagramArtifactParams = {
  userId: string;
  workspaceId: string;
  agentId?: string;
  messageId?: string;
  title: string;
  prompt: string;
  excalidrawJsonStr: string;
  svgStr: string;
  pngBuffer?: Buffer;
};

export async function createDiagramArtifact(params: CreateDiagramArtifactParams) {
  const { userId, workspaceId, agentId, messageId, title, prompt, excalidrawJsonStr, svgStr, pngBuffer } = params;

  const files: ExcalidrawArtifactFile[] = [];

  // 1. Persist Source (.excalidraw)
  const sourceResult = await persistAgentArtifact({
    userId,
    projectId: workspaceId,
    filename: `${title}.excalidraw`,
    bytes: Buffer.from(excalidrawJsonStr, "utf8"),
    createdByType: "agent",
    createdByAgentId: agentId,
  });
  files.push({
    kind: "source",
    name: sourceResult.file.filename,
    mimeType: sourceResult.file.mimeType,
    storageKey: sourceResult.file.currentRevision?.storageKey || "",
    url: `/api/files/${sourceResult.file.id}/download`,
    size: sourceResult.file.sizeBytes,
  });

  // 2. Persist Preview (.svg) — requires `.svg` in EXPLICIT_ALLOWED (server-generated).
  const svgResult = await persistAgentArtifact({
    userId,
    projectId: workspaceId,
    filename: `${title}.svg`,
    bytes: Buffer.from(svgStr, "utf8"),
    createdByType: "agent",
    createdByAgentId: agentId,
  });
  files.push({
    kind: "preview",
    name: svgResult.file.filename,
    mimeType: svgResult.file.mimeType,
    storageKey: svgResult.file.currentRevision?.storageKey || "",
    url: `/api/files/${svgResult.file.id}/download`,
    size: svgResult.file.sizeBytes,
  });

  // 3. Persist Fallback (.png) optionally
  if (pngBuffer) {
    const pngResult = await persistAgentArtifact({
      userId,
      projectId: workspaceId,
      filename: `${title}.png`,
      bytes: pngBuffer,
      createdByType: "agent",
      createdByAgentId: agentId,
    });
    files.push({
      kind: "fallback",
      name: pngResult.file.filename,
      mimeType: pngResult.file.mimeType,
      storageKey: pngResult.file.currentRevision?.storageKey || "",
      url: `/api/files/${pngResult.file.id}/download`,
      size: pngResult.file.sizeBytes,
    });
  }

  // Create Artifact record
  const artifact = await prisma.artifact.create({
    data: {
      workspaceId,
      agentId,
      messageId,
      title,
      prompt,
      type: "diagram.excalidraw",
      files: files as any,
    },
  });

  return artifact;
}
