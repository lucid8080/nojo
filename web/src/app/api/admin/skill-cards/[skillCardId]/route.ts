import type { Prisma, SkillCardSourceType, SkillCardStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { toAdminSkillCardDetail } from "@/lib/skillCard/skillCardDto";
import { normalizeSlug } from "@/lib/skillCard/normalizeSlug";
import { parseTagsInput } from "@/lib/skillCard/skillCardTags";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const SOURCE_TYPES = new Set<string>([
  "MANUAL",
  "IMPORTED_MARKDOWN",
  "IMPORTED_SKILL",
  "OTHER",
]);

const STATUSES = new Set<string>(["DRAFT", "PUBLISHED"]);

function parseSourceType(v: unknown): SkillCardSourceType | null | undefined {
  if (v === null) return null;
  if (v === undefined) return undefined;
  if (typeof v !== "string" || !SOURCE_TYPES.has(v)) return undefined;
  return v as SkillCardSourceType;
}

function parseStatus(v: unknown): SkillCardStatus | undefined {
  if (typeof v !== "string" || !STATUSES.has(v)) return undefined;
  return v as SkillCardStatus;
}

type Params = { skillCardId: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { skillCardId } = await params;
    if (!skillCardId?.trim()) {
      return NextResponse.json({ success: false, message: "Missing skillCardId." }, { status: 400 });
    }

    const row = await prisma.skillCard.findUnique({
      where: { id: skillCardId },
    });

    if (!row) {
      return NextResponse.json({ success: false, message: "Skill card not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { skillCard: toAdminSkillCardDetail(row) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { skillCardId } = await params;
    if (!skillCardId?.trim()) {
      return NextResponse.json({ success: false, message: "Missing skillCardId." }, { status: 400 });
    }

    const existing = await prisma.skillCard.findUnique({ where: { id: skillCardId } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Skill card not found." }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const data: Prisma.SkillCardUpdateInput = {};

    if (typeof body.title === "string") data.title = body.title.trim();
    if (typeof body.summary === "string") data.summary = body.summary.trim();
    if (typeof body.category === "string") data.category = body.category.trim();
    if (typeof body.fullDefinitionMarkdown === "string") {
      data.fullDefinitionMarkdown = body.fullDefinitionMarkdown;
    }
    if (body.tags !== undefined) data.tags = parseTagsInput(body.tags);

    const st = parseStatus(body.status);
    if (st) data.status = st;

    const src = parseSourceType(body.sourceType);
    if (src !== undefined) data.sourceType = src;
    if (body.sourcePath === null) data.sourcePath = null;
    else if (typeof body.sourcePath === "string") {
      data.sourcePath = body.sourcePath.trim() || null;
    }

    if (typeof body.slug === "string") {
      const slug = normalizeSlug(body.slug);
      if (!slug) {
        return NextResponse.json(
          { success: false, message: "Invalid slug after normalization." },
          { status: 400 },
        );
      }
      if (slug !== existing.slug) {
        const clash = await prisma.skillCard.findUnique({ where: { slug } });
        if (clash) {
          return NextResponse.json(
            { success: false, message: `Slug already in use: ${slug}` },
            { status: 409 },
          );
        }
      }
      data.slug = slug;
    }

    const row = await prisma.skillCard.update({
      where: { id: skillCardId },
      data,
    });

    return NextResponse.json({
      success: true,
      data: { skillCard: toAdminSkillCardDetail(row) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { skillCardId } = await params;
    if (!skillCardId?.trim()) {
      return NextResponse.json({ success: false, message: "Missing skillCardId." }, { status: 400 });
    }

    const existing = await prisma.skillCard.findUnique({ where: { id: skillCardId } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Skill card not found." }, { status: 404 });
    }

    await prisma.skillCard.delete({ where: { id: skillCardId } });

    return NextResponse.json({
      success: true,
      data: { deletedId: skillCardId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
