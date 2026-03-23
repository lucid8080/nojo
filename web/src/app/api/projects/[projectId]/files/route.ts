import { NextRequest, NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth-server";
import { persistAgentArtifact } from "@/lib/files/persistAgentArtifact";
import { requireProjectOwnedByUser } from "@/lib/files/nojoFileAuth";

export const runtime = "nodejs";

function isAllowedCreatorType(raw: unknown): "USER" | "AGENT" {
  if (raw === "agent") return "AGENT";
  if (raw === "user") return "USER";
  if (raw === "AGENT") return "AGENT";
  if (raw === "USER") return "USER";
  return "USER";
}

async function parseMultipartSingleFile(req: NextRequest): Promise<{
  fileBytes: Buffer;
  originalFilename: string;
  changeSummary: string | null;
  createdByType: "USER" | "AGENT";
  createdByAgentId: string | null;
}> {
  const form = await req.formData();
  const fileValue = form.get("file");
  if (!fileValue || typeof fileValue !== "object") {
    throw new Error("Missing `file` field.");
  }

  const maybeFile = fileValue as unknown as { name?: unknown; arrayBuffer?: () => Promise<ArrayBuffer> };
  const originalFilename = typeof maybeFile.name === "string" ? maybeFile.name : "";
  if (!originalFilename) {
    throw new Error("Missing file name.");
  }
  if (typeof maybeFile.arrayBuffer !== "function") {
    throw new Error("Invalid file payload.");
  }

  const fileBytes = Buffer.from(await maybeFile.arrayBuffer());

  // Optional metadata fields, passed as strings from the client.
  const changeSummaryRaw = form.get("changeSummary");
  const changeSummary =
    typeof changeSummaryRaw === "string" && changeSummaryRaw.trim().length > 0
      ? changeSummaryRaw.trim()
      : null;

  const createdByTypeRaw = form.get("createdByType");
  const createdByType = isAllowedCreatorType(
    typeof createdByTypeRaw === "string" ? createdByTypeRaw.trim() : undefined,
  );

  const createdByAgentIdRaw = form.get("createdByAgentId");
  const createdByAgentId =
    typeof createdByAgentIdRaw === "string" && createdByAgentIdRaw.trim().length > 0
      ? createdByAgentIdRaw.trim()
      : null;

  return { fileBytes, originalFilename, changeSummary, createdByType, createdByAgentId };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ projectId: string }> },
) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to view files." },
        { status: 401 },
      );
    }

    const { projectId: rawProjectId } = await ctx.params;
    const projectId = decodeURIComponent(rawProjectId).trim();
    if (!projectId) {
      return NextResponse.json({ success: false, message: "Invalid projectId." }, { status: 400 });
    }

    await requireProjectOwnedByUser({ userId, projectId });

    const files = await prisma.projectFile.findMany({
      where: { projectId, ownerUserId: userId, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      include: {
        currentRevision: {
          select: {
            id: true,
            versionNumber: true,
            createdAt: true,
            changeSummary: true,
            createdByType: true,
          },
        },
      },
    });

    const mapped = files.map((f) => ({
      id: f.id,
      filename: f.filename,
      mimeType: f.mimeType,
      extension: f.extension,
      sizeBytes: f.sizeBytes,
      updatedAt: f.updatedAt.toISOString(),
      currentRevision: f.currentRevision
        ? {
            id: f.currentRevision.id,
            versionNumber: f.currentRevision.versionNumber,
            createdAt: f.currentRevision.createdAt.toISOString(),
            changeSummary: f.currentRevision.changeSummary,
            createdByType: f.currentRevision.createdByType,
          }
        : null,
    }));

    return NextResponse.json({ success: true, files: mapped });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[projects/:projectId/files][GET]", err);
    if (message.toLowerCase().includes("not found")) {
      return NextResponse.json({ success: false, message }, { status: 404 });
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ projectId: string }> },
) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to upload files." },
        { status: 401 },
      );
    }

    const { projectId: rawProjectId } = await ctx.params;
    const projectId = decodeURIComponent(rawProjectId).trim();
    if (!projectId) {
      return NextResponse.json({ success: false, message: "Invalid projectId." }, { status: 400 });
    }

    await requireProjectOwnedByUser({ userId, projectId });

    const { fileBytes, originalFilename, changeSummary, createdByType, createdByAgentId } =
      await parseMultipartSingleFile(req);

    const sizeBytes = fileBytes.byteLength;
    if (sizeBytes <= 0) {
      return NextResponse.json({ success: false, message: "Empty upload." }, { status: 400 });
    }

    const createdByTypeForHelper = createdByType === "AGENT" ? "agent" : "user";

    const result = await persistAgentArtifact({
      userId,
      projectId,
      filename: originalFilename,
      bytes: fileBytes,
      changeSummary,
      createdByType: createdByTypeForHelper,
      createdByAgentId: createdByAgentId ?? null,
      forceNewFile: true,
    });

    return NextResponse.json({ success: true, file: result.file });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[projects/:projectId/files][POST]", err);
    if (message.toLowerCase().includes("not allowed") || message.toLowerCase().includes("extension")) {
      return NextResponse.json({ success: false, message }, { status: 400 });
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

