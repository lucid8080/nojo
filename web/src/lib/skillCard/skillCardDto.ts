import type { SkillCard } from "@prisma/client";
import type { AdminSkillCardDetail, AdminSkillCardListRow } from "@/types/admin";
import { tagsFromJson } from "./skillCardTags";

function baseRow(row: SkillCard): AdminSkillCardListRow {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    tags: tagsFromJson(row.tags),
    status: row.status,
    sourceType: row.sourceType,
    sourcePath: row.sourcePath,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAdminSkillCardListRow(row: SkillCard): AdminSkillCardListRow {
  return baseRow(row);
}

export function toAdminSkillCardDetail(row: SkillCard): AdminSkillCardDetail {
  return {
    ...baseRow(row),
    fullDefinitionMarkdown: row.fullDefinitionMarkdown,
  };
}
