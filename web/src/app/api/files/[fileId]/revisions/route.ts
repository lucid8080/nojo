import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { persistAgentArtifact } from "@/lib/files/persistAgentArtifact";

export const runtime = "nodejs";

function decodeId(raw: string): string {
  return decodeURIComponent(raw).trim();
}

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

  const maybeFile = fileValue as unknown as {
    name?: unknown;
    arrayBuffer?: () => Promise<ArrayBuffer>;
  };

  const originalFilename = typeof maybeFile.name === "string" ? maybeFile.name : "";
  if (!originalFilename) throw new Error("Missing file name.");
  if (typeof maybeFile.arrayBuffer !== "function") throw new Error("Invalid file payload.");

  const fileBytes = Buffer.from(await maybeFile.arrayBuffer());

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

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ fileId: string }> },
) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to upload revisions." },
        { status: 401 },
      );
    }

    const { fileId: rawFileId } = await ctx.params;
    const fileId = decodeId(rawFileId);
    if (!fileId) {
      return NextResponse.json({ success: false, message: "Invalid fileId." }, { status: 400 });
    }

    const file = await prisma.projectFile.findFirst({
      where: { id: fileId, ownerUserId: userId, archivedAt: null },
      select: { id: true, projectId: true },
    });
    if (!file) {
      return NextResponse.json({ success: false, message: "File not found." }, { status: 404 });
    }

    const { fileBytes, originalFilename, changeSummary, createdByType, createdByAgentId } =
      await parseMultipartSingleFile(req);
    if (fileBytes.byteLength <= 0) {
      return NextResponse.json({ success: false, message: "Empty upload." }, { status: 400 });
    }

    const createdByTypeForHelper = createdByType === "AGENT" ? "agent" : "user";
    const result = await persistAgentArtifact({
      userId,
      projectId: file.projectId,
      projectFileId: fileId,
      filename: originalFilename,
      bytes: fileBytes,
      changeSummary,
      createdByType: createdByTypeForHelper,
      createdByAgentId: createdByAgentId ?? null,
    });

    return NextResponse.json({ success: true, file: result.file });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[files/:fileId/revisions][POST]", err);
    if (message.toLowerCase().includes("not allowed") || message.toLowerCase().includes("extension")) {
      return NextResponse.json({ success: false, message }, { status: 400 });
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

