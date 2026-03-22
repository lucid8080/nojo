import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getMarketplaceSkillCardItems } from "@/data/marketplaceSkillCatalog";
import { integrationCategories } from "@/data/integrationsData";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const cards = getMarketplaceSkillCardItems();
    const skills = cards.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      description: item.description,
      categoryTag: item.categoryTag,
      source: item.kind === "importable" ? ("static_catalog" as const) : ("bundled_agency" as const),
      isPremium: Boolean(item.isPremium),
      importable: item.kind === "importable",
      editableBackend: false as const,
    }));

    const integrations = integrationCategories.flatMap((cat) =>
      cat.integrations.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        categoryId: cat.id,
        categoryName: cat.name,
        source: "static_catalog" as const,
        editableBackend: false as const,
      })),
    );

    return NextResponse.json({
      success: true,
      data: {
        skills,
        integrations,
        meta: {
          skillsCount: skills.length,
          integrationsCount: integrations.length,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
