import type { Prisma, SkillCardSourceType, SkillCardStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { toAdminSkillCardListRow } from "@/lib/skillCard/skillCardDto";
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

function parseSourceType(v: unknown): SkillCardSourceType | undefined | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string" || !SOURCE_TYPES.has(v)) {
    return undefined;
  }
  return v as SkillCardSourceType;
}

function parseStatus(v: unknown): SkillCardStatus | undefined {
  if (typeof v !== "string" || !STATUSES.has(v)) return undefined;
  return v as SkillCardStatus;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const statusFilter = searchParams.get("status")?.trim() ?? "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.SkillCardWhereInput = {
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { slug: { contains: q } },
              { summary: { contains: q } },
              { category: { contains: q } },
            ],
          }
        : {}),
      ...(statusFilter === "DRAFT" || statusFilter === "PUBLISHED"
        ? { status: statusFilter }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.skillCard.count({ where }),
      prisma.skillCard.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        rows: rows.map(toAdminSkillCardListRow),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const rawSlug = typeof body.slug === "string" ? body.slug : "";
    const slug = normalizeSlug(rawSlug);
    const fullDefinitionMarkdown =
      typeof body.fullDefinitionMarkdown === "string" ? body.fullDefinitionMarkdown : "";
    const tags = parseTagsInput(body.tags);
    const status = parseStatus(body.status) ?? "DRAFT";
    const sourceType = parseSourceType(body.sourceType);
    const sourcePath =
      typeof body.sourcePath === "string" && body.sourcePath.trim()
        ? body.sourcePath.trim()
        : null;

    if (!title) {
      return NextResponse.json({ success: false, message: "title is required." }, { status: 400 });
    }
    if (!slug) {
      return NextResponse.json(
        { success: false, message: "slug is required (provide a valid slug after normalization)." },
        { status: 400 },
      );
    }

    const existing = await prisma.skillCard.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Slug already in use: ${slug}` },
        { status: 409 },
      );
    }

    const row = await prisma.skillCard.create({
      data: {
        slug,
        title,
        summary,
        category: category || "General",
        tags,
        status,
        fullDefinitionMarkdown,
        sourceType: sourceType === undefined ? null : sourceType,
        sourcePath,
      },
    });

    return NextResponse.json({
      success: true,
      data: { skillCard: toAdminSkillCardListRow(row) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
