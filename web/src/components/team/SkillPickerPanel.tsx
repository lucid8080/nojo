"use client";

import type { ImportableSkill } from "@/data/teamPageMock";
import { importableSkillsMock, skillCategories } from "@/data/teamPageMock";
import { getCategoryFilterSelectedClasses } from "@/lib/categoryColors";
import { useMemo, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white";

export function SkillPickerPanel({
  selectedIds,
  onToggle,
  excludeIds,
  title = "Available skills",
}: {
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
  /** Already assigned — shown disabled */
  excludeIds?: readonly string[];
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const exclude = useMemo(
    () => new Set(excludeIds ?? []),
    [excludeIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return importableSkillsMock.filter((s) => {
      const catOk = category === "All" || s.category === category;
      const textOk =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      return catOk && textOk;
    });
  }, [query, category]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
        {title}
      </p>
      <input
        type="search"
        className={inputClass}
        placeholder="Search skills…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search skills"
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
        {skillCategories.map((cat) => {
          const selected = category === cat;
          const isAll = cat === "All";
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={
                selected
                  ? isAll
                    ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-neutral-100 dark:text-slate-900"
                    : `rounded-full px-3 py-1 text-xs font-semibold ${getCategoryFilterSelectedClasses(cat)}`
                  : "rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200"
              }
            >
              {cat}
            </button>
          );
        })}
      </div>
      <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-2 dark:border-slate-600">
        {filtered.map((s) => (
          <SkillPickerRow
            key={s.id}
            skill={s}
            checked={selectedSet.has(s.id)}
            disabled={exclude.has(s.id)}
            onToggle={() => onToggle(s.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function SkillPickerRow({
  skill,
  checked,
  disabled,
  onToggle,
}: {
  skill: ImportableSkill;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <label
        className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm ${
          disabled
            ? "opacity-50"
            : "hover:bg-neutral-50 dark:hover:bg-slate-800"
        }`}
      >
        <input
          type="checkbox"
          className="mt-0.5 rounded border-neutral-300"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
        />
        <span className="min-w-0 flex-1">
          <span className="font-medium text-slate-900 dark:text-white">
            <span aria-hidden className="mr-1">
              {skill.icon}
            </span>
            {skill.name}
          </span>
          <span className="mt-0.5 block text-xs text-slate-500 dark:text-neutral-500">
            {skill.description}
          </span>
        </span>
      </label>
    </li>
  );
}
