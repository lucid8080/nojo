import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function isString(v: unknown): v is string {
  return typeof v === "string";
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to view projects." },
        { status: 401 },
      );
    }

    const projects = await prisma.project.findMany({
      where: { ownerUserId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, projects });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[projects][GET]", err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to create a project." },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Invalid body." }, { status: 400 });
    }

    const o = body as Record<string, unknown>;

    const name = isString(o.name) ? o.name.trim() : "";
    if (!name) {
      return NextResponse.json({ success: false, message: "name is required." }, { status: 400 });
    }
    if (name.length > 200) {
      return NextResponse.json(
        { success: false, message: "name must be at most 200 characters." },
        { status: 400 },
      );
    }

    const descriptionRaw = o.description;
    const description = isString(descriptionRaw) ? descriptionRaw.trim() : null;
    const descriptionFinal = description && description.length > 0 ? description : null;
    if (descriptionFinal && descriptionFinal.length > 2000) {
      return NextResponse.json(
        { success: false, message: "description must be at most 2000 characters." },
        { status: 400 },
      );
    }

    const project = await prisma.project.create({
      data: {
        ownerUserId: userId,
        name,
        description: descriptionFinal,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[projects][POST]", err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

