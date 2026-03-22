"use client";

import { SkillMarkdownDoc } from "@/components/skills/SkillMarkdownDoc";

type Props = {
  markdown: string;
};

/** Client wrapper so admin forms can live-preview markdown beside the editor. */
export function SkillCardMarkdownPreview({ markdown }: Props) {
  return (
    <div className="max-h-[min(70vh,800px)] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
      {markdown.trim() ? (
        <SkillMarkdownDoc markdown={markdown} />
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nothing to preview yet.</p>
      )}
    </div>
  );
}
