import { TopNav } from "@/components/dashboard/TopNav";
import { SkillAssignmentsPanel } from "@/components/skills/SkillAssignmentsPanel";
import { SkillMarkdownDoc } from "@/components/skills/SkillMarkdownDoc";
import { headerNavItems } from "@/data/dashboardSampleData";
import {
  getCategoryCardClasses,
  getCategoryTagClasses,
} from "@/lib/categoryColors";
import { loadAgencySkillMarkdown } from "@/lib/nojo/agencySkillLoader";
import { resolveSkillByEncodedId } from "@/lib/nojo/resolveSkill";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ skillId: string }> };

function divisionChipLabel(division: string) {
  return division.replace(/-/g, " ").toUpperCase();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { skillId } = await params;
  const resolved = resolveSkillByEncodedId(skillId);
  if (!resolved) {
    return { title: "Skill | HireFlow" };
  }
  if (resolved.kind === "importable") {
    return {
      title: `${resolved.skill.name} | HireFlow`,
      description: resolved.skill.description,
    };
  }
  return {
    title: `${resolved.agent.title} | HireFlow`,
    description: resolved.agent.description,
  };
}

export default async function SkillDetailPage({ params }: Props) {
  const { skillId } = await params;
  const resolved = resolveSkillByEncodedId(skillId);
  if (!resolved) {
    notFound();
  }

  const canonicalId =
    resolved.kind === "importable" ? resolved.skill.id : resolved.agent.id;

  let syncLabel = "—";
  try {
    if (resolved.kind === "agency") {
      syncLabel = new Date(resolved.payload.generatedAt).toLocaleString(
        undefined,
        { dateStyle: "short", timeStyle: "short" },
      );
    }
  } catch {
    syncLabel = resolved.kind === "agency" ? resolved.payload.generatedAt : "—";
  }

  const agencyDoc =
    resolved.kind === "agency"
      ? loadAgencySkillMarkdown(resolved.agent.localContentPath)
      : null;

  const fm = resolved.kind === "agency" ? resolved.agent.frontmatter : null;
  const emoji =
    fm && typeof fm.emoji === "string" && fm.emoji.trim()
      ? fm.emoji.trim()
      : null;
  const vibe =
    fm && typeof fm.vibe === "string" && fm.vibe.trim()
      ? fm.vibe.trim()
      : null;
  const colorHint =
    fm && typeof fm.color === "string" && fm.color.trim()
      ? fm.color.trim()
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-neutral-50 to-sky-50/20 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-neutral-50">
      <TopNav items={headerNavItems} />
      <main
        className={`mx-auto w-full px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20 lg:pt-8 ${resolved.kind === "agency" ? "max-w-4xl" : "max-w-3xl"}`}
      >
        <p className="mb-4">
          <Link
            href="/marketplace"
            className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            ← Agent skills
          </Link>
        </p>

        {resolved.kind === "importable" ? (
          <article
            className={`rounded-2xl border border-neutral-200/60 bg-white/90 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60 ${getCategoryCardClasses(resolved.skill.category)}`}
          >
            <div className="flex flex-wrap items-start gap-4">
              <span
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm dark:bg-slate-800"
                aria-hidden
              >
                {resolved.skill.icon}
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {resolved.skill.name}
                </h1>
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getCategoryTagClasses(resolved.skill.category)}`}
                >
                  {resolved.skill.category}
                </span>
              </div>
            </div>

            <dl className="mt-6 space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-slate-700 dark:text-neutral-300">
                  Status
                </dt>
                <dd className="mt-0.5 text-slate-600 dark:text-neutral-400">
                  Workspace catalog — available to assign to agents
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700 dark:text-neutral-300">
                  Purpose
                </dt>
                <dd className="mt-0.5 text-slate-600 dark:text-neutral-400">
                  {resolved.skill.description}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700 dark:text-neutral-300">
                  Compatibility
                </dt>
                <dd className="mt-0.5 text-slate-600 dark:text-neutral-400">
                  {resolved.skill.compatibility}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700 dark:text-neutral-300">
                  Skill id
                </dt>
                <dd className="mt-0.5 font-mono text-xs text-slate-500 dark:text-neutral-500">
                  {resolved.skill.id}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2 text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                title="Editing skill metadata requires a connected backend."
              >
                Edit metadata
              </button>
            </div>
          </article>
        ) : (
          <div className="space-y-8">
            <article
              className={`rounded-2xl border border-neutral-200/60 bg-white/90 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60 ${getCategoryCardClasses(resolved.agent.categoryLabel)}`}
            >
              <div className="flex flex-wrap items-start gap-4">
                {emoji ? (
                  <span
                    className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm dark:bg-slate-800"
                    aria-hidden
                  >
                    {emoji}
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {resolved.agent.title}
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
                    {resolved.agent.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getCategoryTagClasses(resolved.agent.categoryLabel)}`}
                >
                  {resolved.agent.categoryLabel}
                </span>
                <span className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-300">
                  {divisionChipLabel(resolved.agent.division)}
                </span>
                {colorHint ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-300"
                    title="Color from source frontmatter"
                  >
                    <span
                      className="inline-block size-2.5 rounded-full border border-neutral-300 dark:border-slate-600"
                      style={{ backgroundColor: colorHint }}
                      aria-hidden
                    />
                    Accent
                  </span>
                ) : null}
              </div>

              {vibe ? (
                <p className="mt-4 rounded-xl border border-sky-200/80 bg-sky-50/50 p-3 text-sm text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
                  <span className="font-semibold">Vibe: </span>
                  {vibe}
                </p>
              ) : null}

              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-700 dark:text-neutral-300">
                    Status
                  </dt>
                  <dd className="mt-0.5 text-slate-600 dark:text-neutral-400">
                    Local bundle — synced {syncLabel}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-700 dark:text-neutral-300">
                    Source
                  </dt>
                  <dd className="mt-0.5 break-all text-slate-600 dark:text-neutral-400">
                    {resolved.payload.source}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-700 dark:text-neutral-300">
                    Branch
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs text-slate-600 dark:text-neutral-400">
                    {resolved.payload.branch}
                  </dd>
                </div>
                {resolved.payload.repoCommitSha ? (
                  <div>
                    <dt className="font-semibold text-slate-700 dark:text-neutral-300">
                      Repo commit
                    </dt>
                    <dd className="mt-0.5 font-mono text-xs text-slate-600 dark:text-neutral-400">
                      {resolved.payload.repoCommitSha.slice(0, 7)}…
                    </dd>
                  </div>
                ) : null}
                {resolved.agent.contentSha ? (
                  <div>
                    <dt className="font-semibold text-slate-700 dark:text-neutral-300">
                      File blob SHA
                    </dt>
                    <dd className="mt-0.5 font-mono text-xs text-slate-600 dark:text-neutral-400">
                      {resolved.agent.contentSha.slice(0, 7)}…
                    </dd>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-700 dark:text-neutral-300">
                    Skill id
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs text-slate-500 dark:text-neutral-500">
                    {resolved.agent.id}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={resolved.agent.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  View on GitHub
                </a>
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2 text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                  title="Editing skill metadata requires a connected backend."
                >
                  Edit metadata
                </button>
              </div>
            </article>

            <section className="rounded-2xl border border-neutral-200/60 bg-white/90 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                Full skill definition
              </h2>
              <p className="mb-6 text-sm text-slate-500 dark:text-neutral-500">
                Imported from the bundled copy of the agency-agents repository
                (markdown below matches sync time above).
              </p>
              {agencyDoc?.body ? (
                <SkillMarkdownDoc markdown={agencyDoc.body} />
              ) : (
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Bundled markdown was not found for this skill. Run{" "}
                  <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs dark:bg-slate-800">
                    npm run sync:agents
                  </code>{" "}
                  in the web project and ensure files exist under{" "}
                  <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs dark:bg-slate-800">
                    src/data/agency-agents-bundled/
                  </code>
                  .
                </p>
              )}
            </section>
          </div>
        )}

        <div className="mt-8">
          <SkillAssignmentsPanel canonicalSkillId={canonicalId} />
        </div>
      </main>
    </div>
  );
}
