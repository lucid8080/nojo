import { cmsSkillCardsToMarketplaceModels } from "@/data/marketplaceSkillCatalog";
import { prisma } from "@/lib/db";

/** Published CMS skill cards for marketplace / team merge (server-only). */
export async function getPublishedCmsMarketplaceModels() {
  const rows = await prisma.skillCard.findMany({
    where: { status: "PUBLISHED" },
    select: {
      slug: true,
      title: true,
      summary: true,
      category: true,
      tags: true,
    },
    orderBy: { title: "asc" },
  });
  return cmsSkillCardsToMarketplaceModels(rows);
}
