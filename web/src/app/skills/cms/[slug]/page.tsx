import { TopNav } from "@/components/dashboard/TopNav";
import { SkillAssignmentsPanel } from "@/components/skills/SkillAssignmentsPanel";
import { SkillMarkdownDoc } from "@/components/skills/SkillMarkdownDoc";
import { headerNavItems } from "@/data/dashboardSampleData";
import { getCategoryTagClasses } from "@/lib/categoryColors";
import { prisma } from "@/lib/db";
import { tagsFromJson } from "@/lib/skillCard/skillCardTags";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await prisma.skillCard.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { title: true, summary: true },
  });
  if (!row) {
    return { title: "Skill | HireFlow" };
  }
  return {
    title: `${row.title} | HireFlow`,
    description: row.summary,
  };
}

export default async function CmsSkillDetailPage({ params }: Props) {
  const { slug } = await params;
  const row = await prisma.skillCard.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
  if (!row) {
    notFound();
  }

  const tags = tagsFromJson(row.tags);
  const canonicalId = `cms:${row.slug}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-neutral-50 to-sky-50/20 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-neutral-50">
      <TopNav items={headerNavItems} />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20 lg:pt-8">
        <p className="mb-4">
          <Link
            href="/marketplace"
            className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            ← Agent skills
          </Link>
        </p>

        <article className="rounded-2xl border border-neutral-200/60 bg-white/90 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-start gap-4">
            <span
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm dark:bg-slate-800"
              aria-hidden
            >
              📄
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {row.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
                {row.summary}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getCategoryTagClasses(row.category)}`}
            >
              {row.category}
            </span>
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-300"
              >
                {t}
              </span>
            ))}
          </div>

          <dl className="mt-6 space-y-2 text-sm">
            <div>
              <dt className="font-semibold text-slate-700 dark:text-neutral-300">
                Skill id
              </dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-500 dark:text-neutral-500">
                {canonicalId}
              </dd>
            </div>
          </dl>
        </article>

        <section className="mt-8 rounded-2xl border border-neutral-200/60 bg-white/90 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Full skill definition
          </h2>
          <SkillMarkdownDoc markdown={row.fullDefinitionMarkdown} />
        </section>

        <div className="mt-8">
          <SkillAssignmentsPanel canonicalSkillId={canonicalId} />
        </div>
      </main>
    </div>
  );
}
