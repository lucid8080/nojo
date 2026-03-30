import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";

import { getSessionUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { resolveNojoFilesRoot, resolveStorageAbsPath } from "@/lib/files/nojoFileStorage";

export const runtime = "nodejs";

function decodeId(raw: string): string {
  return decodeURIComponent(raw).trim();
}

function toRfc5987Filename(filename: string): string {
  // RFC 5987: encode as UTF-8 and percent-escape.
  return encodeURIComponent(filename)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ fileId: string }> },
) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to download files." },
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
      select: {
        id: true,
        filename: true,
        currentRevision: {
          select: {
            id: true,
            storageKey: true,
            mimeType: true,
            sizeBytes: true,
          },
        },
      },
    });

    if (!file || !file.currentRevision) {
      return NextResponse.json({ success: false, message: "File not found." }, { status: 404 });
    }

    const rootAbs = await resolveNojoFilesRoot();
    const absPath = resolveStorageAbsPath({
      rootAbs,
      storageKey: file.currentRevision.storageKey,
    });

    // Ensure it exists before returning a streaming response.
    try {
      await fs.promises.stat(absPath);
    } catch {
      return NextResponse.json(
        { success: false, message: "File bytes missing from storage." },
        { status: 404 },
      );
    }

    const stream = fs.createReadStream(absPath);

    const mime = (file.currentRevision.mimeType || "application/octet-stream").toLowerCase();
    const forceAttachment = req.nextUrl.searchParams.get("attachment") === "1";
    // Browsers often refuse to render <img src> when Content-Disposition is attachment.
    const useInline =
      !forceAttachment &&
      (mime.startsWith("image/") || mime.includes("svg"));

    const disposition = useInline ? "inline" : "attachment";

    const headers = {
      "Content-Type": file.currentRevision.mimeType || "application/octet-stream",
      "Content-Disposition": `${disposition}; filename*=UTF-8''${toRfc5987Filename(
        file.filename,
      )}`,
      "Content-Length": String(file.currentRevision.sizeBytes ?? 0),
      "Cache-Control": "no-store",
    };

    return new NextResponse(stream as any, { status: 200, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[files/:fileId/download][GET]", err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

