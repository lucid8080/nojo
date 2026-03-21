"use client";

import { AgentAvatarPicker } from "@/components/avatar/AgentAvatarPicker";
import { SkillPickerPanel } from "@/components/team/SkillPickerPanel";
import { AGENT_CREATION_TEMPLATES } from "@/lib/nojo/agentCreationTemplates";
import { initialsFromDisplayName } from "@/lib/nojo/agentDisplayName";
import { patchOverride } from "@/lib/nojo/agentIdentityOverrides";
import {
  appendCustomAgent,
  generateTeamAgentId,
} from "@/lib/nojo/teamWorkspaceStore";
import { defaultAvatarFilename } from "@/lib/agentAvatars";
import {
  AVATAR_ACCENT_BG_500,
  type CategoryColorName,
  getAgentAvatarFrameClassFromAgent,
} from "@/lib/categoryColors";
import { importableSkillsMock } from "@/data/teamPageMock";
import { recommendedSkillIdsForRole } from "@/lib/nojo/skillCatalog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const fieldLabel =
  "mb-1 block text-xs font-semibold text-slate-600 dark:text-neutral-400";
const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white";

export function CreateAgentSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  /** Called with new agent id after persist */
  onCreated: (agentId: string) => void;
}) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const draftId = useMemo(() => generateTeamAgentId(), []);
  const [templateId, setTemplateId] = useState<string>("blank");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [emoji, setEmoji] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [vibe, setVibe] = useState("");
  /** null = use template/category default ring */
  const [accentKey, setAccentKey] = useState<CategoryColorName | null>(null);
  const [avatarFile, setAvatarFile] = useState(() =>
    defaultAvatarFilename(draftId),
  );
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  const template = useMemo(
    () =>
      AGENT_CREATION_TEMPLATES.find((t) => t.id === templateId) ??
      AGENT_CREATION_TEMPLATES[0]!,
    [templateId],
  );

  const resetFormFromTemplate = useCallback(
    (tid: string) => {
      const t =
        AGENT_CREATION_TEMPLATES.find((x) => x.id === tid) ??
        AGENT_CREATION_TEMPLATES[0]!;
      setRole(t.role);
      setEmoji(t.emoji);
      setShortDescription(t.shortDescription);
      setVibe(t.vibe);
      setAccentKey(null);
      setSkillIds([...t.recommendedSkillIds]);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (avatarPickerOpen) {
        setAvatarPickerOpen(false);
        return;
      }
      onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, avatarPickerOpen]);

  function applyTemplate(tid: string) {
    setTemplateId(tid);
    resetFormFromTemplate(tid);
    const t =
      AGENT_CREATION_TEMPLATES.find((x) => x.id === tid) ??
      AGENT_CREATION_TEMPLATES[0]!;
    if (tid !== "blank") {
      setName((n) => n.trim() || `${t.label} agent`);
    }
  }

  function toggleSkill(id: string) {
    setSkillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSubmit() {
    const displayName = name.trim();
    if (!displayName) {
      setHint("Add a display name");
      return;
    }
    const initials = initialsFromDisplayName(displayName);
    appendCustomAgent({
      id: draftId,
      name: displayName,
      initials,
      role: role.trim() || "Role not set",
      avatarClass: rosterAvatarClass,
      categoryLabel: template.categoryLabel || "SPECIALIZED",
    });
    patchOverride(draftId, {
      name: displayName,
      role: role.trim(),
      initials,
      categoryLabel: template.categoryLabel,
      description: shortDescription.trim(),
      vibe: vibe.trim(),
      emoji: emoji.trim(),
      avatarFile,
      avatarAccent: accentKey ?? "",
      assignedSkillIds: skillIds.length ? skillIds : [],
    });
    onCreated(draftId);
    onClose();
  }

  const rec = useMemo(
    () => recommendedSkillIdsForRole(role, template.categoryLabel),
    [role, template.categoryLabel],
  );

  const rosterAvatarClass = accentKey
    ? AVATAR_ACCENT_BG_500[accentKey]
    : template.avatarClass;

  const previewFrameClass = getAgentAvatarFrameClassFromAgent({
    categoryLabel: template.categoryLabel,
    avatarAccent: accentKey,
  });

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
        <button
          type="button"
          aria-label="Close"
          className="team-panel-backdrop absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] dark:bg-black/50"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-agent-title"
          className="team-panel-sheet relative flex h-full w-full max-w-full flex-col bg-white shadow-2xl dark:bg-slate-900 sm:max-w-lg sm:rounded-l-3xl sm:shadow-xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-slate-700">
            <div>
              <h2
                id="create-agent-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                Create agent
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-neutral-500">
                Workspace-only id (not an OpenClaw runtime agent until
                connected).
              </p>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 transition hover:bg-neutral-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Close"
            >
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-4">
              <span className={fieldLabel}>Template</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {AGENT_CREATION_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t.id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      templateId === t.id
                        ? "border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-400 dark:bg-sky-950/40 dark:text-sky-200"
                        : "border-neutral-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-neutral-500">
                {template.description}
              </p>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAvatarPickerOpen(true)}
                className="shrink-0 rounded-[1.125rem] border-2 border-dashed border-neutral-300 p-0 outline-none ring-offset-2 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-600 dark:ring-offset-slate-900"
                aria-label="Choose avatar and ring color"
              >
                <span
                  className={`inline-flex rounded-2xl p-0.5 shadow-sm ring-2 ring-white dark:ring-slate-900 ${previewFrameClass}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/avatar/${encodeURIComponent(avatarFile)}`}
                    alt=""
                    width={56}
                    height={56}
                    className="size-14 rounded-[0.875rem] object-cover"
                  />
                </span>
              </button>
              <p className="text-xs text-slate-600 dark:text-neutral-400">
                Tap to open the gallery — pick a photo and ring/background
                color. Id:{" "}
                <span className="font-mono text-[11px]">{draftId}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className={fieldLabel} htmlFor="ca-name">
                  Display name
                </label>
                <input
                  id="ca-name"
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Avery Kim"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="ca-role">
                  Role
                </label>
                <input
                  id="ca-role"
                  className={inputClass}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="What they do on the team"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="ca-emoji">
                  Emoji
                </label>
                <input
                  id="ca-emoji"
                  className={inputClass}
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="Optional"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="ca-desc">
                  Short description
                </label>
                <textarea
                  id="ca-desc"
                  className={`${inputClass} min-h-[64px] resize-y`}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="ca-vibe">
                  Vibe / personality
                </label>
                <textarea
                  id="ca-vibe"
                  className={`${inputClass} min-h-[56px] resize-y`}
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  rows={2}
                  placeholder="How they should sound…"
                />
              </div>
            </div>

            {rec.length > 0 ? (
              <div className="mt-4 rounded-xl border border-sky-200/80 bg-sky-50/50 p-3 dark:border-sky-900/40 dark:bg-sky-950/20">
                <p className="text-xs font-semibold text-sky-800 dark:text-sky-300">
                  Recommended for this role
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {rec.map((id) => {
                    const label =
                      importableSkillsMock.find((s) => s.id === id)?.name ?? id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          if (!skillIds.includes(id))
                            setSkillIds((s) => [...s, id]);
                        }}
                        disabled={skillIds.includes(id)}
                        className="rounded-full border border-sky-300 bg-white px-2.5 py-1 text-xs font-medium text-sky-900 disabled:opacity-50 dark:border-sky-700 dark:bg-slate-900 dark:text-sky-200"
                      >
                        + {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-6">
              <SkillPickerPanel
                title="Initial skills"
                selectedIds={skillIds}
                onToggle={toggleSkill}
              />
            </div>

            {hint ? (
              <p className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400">
                {hint}
              </p>
            ) : null}
          </div>

          <div className="border-t border-neutral-200 bg-neutral-50/90 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/90">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Create agent
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <AgentAvatarPicker
        open={avatarPickerOpen}
        agentKey={draftId}
        agentLabel={name.trim() || "New agent"}
        selectedFilenameOverride={avatarFile}
        accentKey={accentKey}
        onAccentChange={setAccentKey}
        categoryLabelForAccent={template.categoryLabel}
        onClose={() => setAvatarPickerOpen(false)}
        onChanged={(filename) => {
          const next = filename ?? defaultAvatarFilename(draftId);
          setAvatarFile(next);
        }}
      />
    </>
  );
}
