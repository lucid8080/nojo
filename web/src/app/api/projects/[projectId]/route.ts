import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to view the project." },
        { status: 401 },
      );
    }

    const { projectId } = await params;
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json({ success: false, message: "Missing projectId." }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerUserId: userId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, message: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, project });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[projects/projectId][GET]", err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

