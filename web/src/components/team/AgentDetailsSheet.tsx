"use client";

import { AgentAvatarPicker } from "@/components/avatar/AgentAvatarPicker";
import { PremiumSkillBadge } from "@/components/skills/PremiumSkillBadge";
import { SkillPickerPanel } from "@/components/team/SkillPickerPanel";
import type { TeamAgent } from "@/data/teamPageMock";
import { importableSkillsMock } from "@/data/marketplaceSkillCatalog";
import { defaultAvatarFilename } from "@/lib/agentAvatars";
import { initialsFromDisplayName } from "@/lib/nojo/agentDisplayName";
import { CANONICAL_NOJO_AGENT_IDS } from "@/lib/nojo/agentIdentityMap";
import {
  type NojoAgentIdentityOverride,
  clearOverride,
  patchOverride,
  resolveAgentAvatarFile,
} from "@/lib/nojo/agentIdentityOverrides";
import { recommendedSkillIdsForRole } from "@/lib/nojo/skillCatalog";
import {
  isCustomTeamAgentId,
  removeCustomAgent,
} from "@/lib/nojo/teamWorkspaceStore";
import {
  type CategoryColorName,
  getAgentAvatarFallbackClassFromAgent,
  getAgentAvatarFrameClassFromAgent,
} from "@/lib/categoryColors";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function toastStub(msg: string) {
  if (typeof window !== "undefined" && window.console) {
    console.info("[Agent details]", msg);
  }
}

function isCanonicalAgentId(id: string) {
  return (CANONICAL_NOJO_AGENT_IDS as readonly string[]).includes(id);
}

export function TeamAgentAvatar({
  agent,
  size,
  onClick,
}: {
  agent: TeamAgent;
  size: "card" | "panel";
  /** Opens agent details when provided (e.g. team cards). */
  onClick?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const src = `/avatar/${encodeURIComponent(agent.avatarFile)}`;
  const isPanel = size === "panel";
  const frame = getAgentAvatarFrameClassFromAgent(agent);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const buttonRing =
    "rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

  if (imgError) {
    const fallback = (
      <div
        className={`flex shrink-0 items-center justify-center text-sm font-bold shadow-sm ring-2 ring-white dark:ring-slate-900 transition-transform duration-200 ease-out hover:scale-110 ${getAgentAvatarFallbackClassFromAgent(agent)} ${isPanel ? "size-14 text-lg rounded-2xl" : "size-11 text-xs rounded-xl"}`}
        aria-hidden
      >
        {agent.initials}
      </div>
    );
    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          className={`inline-flex shrink-0 cursor-pointer ${buttonRing} ${isPanel ? "rounded-2xl" : "rounded-xl"}`}
          aria-label={`View details for ${agent.name}`}
        >
          {fallback}
        </button>
      );
    }
    return fallback;
  }

  const inner = isPanel ? "size-14 rounded-2xl" : "size-11 rounded-xl";
  const innerNode = (
    <span
      className={`inline-flex shrink-0 p-0.5 shadow-sm ring-2 ring-white dark:ring-slate-900 transition-transform duration-200 ease-out hover:scale-110 ${frame} ${isPanel ? "rounded-2xl" : "rounded-xl"}`}
    >
      <Image
        src={src}
        alt=""
        width={isPanel ? 56 : 44}
        height={isPanel ? 56 : 44}
        className={`shrink-0 object-cover ${inner}`}
        onError={() => setImgError(true)}
      />
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex shrink-0 cursor-pointer ${buttonRing}`}
        aria-label={`View details for ${agent.name}`}
      >
        {innerNode}
      </button>
    );
  }

  return innerNode;
}

const fieldLabel =
  "mb-1 block text-xs font-semibold text-slate-600 dark:text-neutral-400";
const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white";

export function AgentDetailsSheet({
  agent,
  open,
  onClose,
  onIdentitySaved,
}: {
  agent: TeamAgent | null;
  open: boolean;
  onClose: () => void;
  /** Optional; identity saves also broadcast `nojo-agent-identity-changed`. */
  onIdentitySaved?: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [vibe, setVibe] = useState("");
  const [emoji, setEmoji] = useState("");
  const [avatarFile, setAvatarFile] = useState("1.png");
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const avatarPickerOpenRef = useRef(false);
  const [accentKey, setAccentKey] = useState<CategoryColorName | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [skillIds, setSkillIds] = useState<string[]>([]);

  useEffect(() => {
    avatarPickerOpenRef.current = avatarPickerOpen;
  }, [avatarPickerOpen]);

  const syncDraftFromAgent = useCallback((a: TeamAgent) => {
    const displayName = a.rosterFieldsMissing?.name
      ? ""
      : a.name === "Unnamed agent"
        ? ""
        : a.name;
    const displayRole = a.rosterFieldsMissing?.role
      ? ""
      : a.role === "Role not set"
        ? ""
        : a.role;
    setName(displayName);
    setRole(displayRole);
    setDescription(a.description);
    setObjective(a.objective);
    setVibe(a.vibe ?? "");
    setEmoji(a.emoji ?? "");
    setAvatarFile(resolveAgentAvatarFile(a.id, a.avatarFile));
    setAccentKey(a.avatarAccent ?? null);
    setSkillIds(a.assignedSkillIds ? [...a.assignedSkillIds] : []);
  }, []);

  useEffect(() => {
    if (!open || !agent) return;
    syncDraftFromAgent(agent);
    setSaveHint(null);
  }, [open, agent, syncDraftFromAgent]);

  useEffect(() => {
    if (!open) setAvatarPickerOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 100);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (avatarPickerOpenRef.current) {
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
  }, [open, onClose]);

  const previewAgent = useMemo((): TeamAgent | null => {
    if (!agent) return null;
    // Strip accent so preview uses draft ring choice only.
    const { avatarAccent: _omit, ...agentBase } = agent;
    void _omit;
    return {
      ...agentBase,
      name: name.trim() || agent.name,
      role: role.trim() || agent.role,
      initials: initialsFromDisplayName(name.trim() || agent.name),
      avatarFile,
      ...(accentKey ? { avatarAccent: accentKey } : {}),
    };
  }, [agent, name, role, avatarFile, accentKey]);

  const handleSave = async () => {
    if (!agent) return;
    const payload: NojoAgentIdentityOverride = {
      name: name.trim(),
      role: role.trim(),
      description: description.trim(),
      objective: objective.trim(),
      vibe: vibe.trim(),
      emoji: emoji.trim(),
      avatarFile,
    };
    if (name.trim()) {
      payload.initials = initialsFromDisplayName(name.trim());
    }
    payload.avatarAccent = accentKey ?? "";
    payload.assignedSkillIds = skillIds.length ? skillIds : [];
    patchOverride(agent.id, payload);
    if (isCustomTeamAgentId(agent.id)) {
      try {
        const res = await fetch(
          `/api/workspace/roster/${encodeURIComponent(agent.id)}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: name.trim() || agent.name,
              initials: name.trim()
                ? initialsFromDisplayName(name.trim())
                : agent.initials,
              role: role.trim() || agent.role,
              avatarClass: agent.avatarClass,
              categoryLabel: agent.categoryLabel ?? null,
              identity: payload,
            }),
          },
        );
        if (!res.ok) {
          const t = await res.text();
          console.warn("[AgentDetailsSheet] roster PATCH failed", res.status, t);
        }
      } catch (e) {
        console.warn("[AgentDetailsSheet] roster PATCH error", e);
      }
    }
    setSaveHint("Saved");
    window.setTimeout(() => setSaveHint(null), 2200);
    onIdentitySaved?.();
  };

  const handleReset = () => {
    if (!agent) return;
    clearOverride(agent.id);
    setSaveHint("Reset to defaults");
    window.setTimeout(() => setSaveHint(null), 2200);
    onIdentitySaved?.();
  };

  const suggestedSkillIds = useMemo(() => {
    if (!agent) return [];
    return recommendedSkillIdsForRole(role, agent.categoryLabel);
  }, [agent, role]);

  const handleArchive = useCallback(() => {
    if (!agent) return;
    if (isCustomTeamAgentId(agent.id)) {
      removeCustomAgent(agent.id);
      clearOverride(agent.id);
      onClose();
      onIdentitySaved?.();
    } else {
      toastStub(`Archive: ${agent.name}`);
    }
  }, [agent, onClose, onIdentitySaved]);

  if (!open || !agent) return null;

  const ag = agent;
  const canonicalId = isCanonicalAgentId(ag.id);
  const headerAgent = previewAgent ?? ag;

  function applyAvatarFromPicker(filename: string | null) {
    const fallback = defaultAvatarFilename(ag.id);
    const nextFile = filename ?? fallback;
    setAvatarFile(nextFile);
    if (filename) {
      patchOverride(ag.id, { avatarFile: filename });
    } else {
      patchOverride(ag.id, { avatarFile: "" });
    }
    onIdentitySaved?.();
  }

  function applyAccentChoice(next: CategoryColorName | null) {
    setAccentKey(next);
    if (next) {
      patchOverride(ag.id, { avatarAccent: next });
    } else {
      patchOverride(ag.id, { avatarAccent: "" });
    }
    onIdentitySaved?.();
  }

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close panel"
        className="team-panel-backdrop absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] dark:bg-black/50"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-agent-panel-title"
        data-team-panel
        className="team-panel-sheet relative flex h-full w-full max-w-full flex-col bg-white shadow-2xl dark:bg-slate-900 sm:max-w-md sm:rounded-l-3xl sm:shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-slate-700">
          <div className="flex min-w-0 items-center gap-3">
            {previewAgent ? (
              <button
                type="button"
                onClick={() => setAvatarPickerOpen(true)}
                className="shrink-0 rounded-2xl outline-none ring-offset-2 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-sky-500 dark:ring-offset-slate-900"
                aria-label={`Change avatar for ${headerAgent.name}`}
                title="Change avatar"
              >
                <TeamAgentAvatar agent={previewAgent} size="panel" />
              </button>
            ) : null}
            <div className="min-w-0">
              <h2
                id="team-agent-panel-title"
                className="truncate text-lg font-bold text-slate-900 dark:text-white"
              >
                {emoji.trim() ? (
                  <span className="mr-1.5" aria-hidden>
                    {emoji.trim()}
                  </span>
                ) : null}
                {headerAgent.name}
              </h2>
              <p className="text-sm text-slate-600 dark:text-neutral-400">
                {headerAgent.role}
              </p>
            </div>
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
          <section className="mb-6 rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
              Identity
            </h3>
            <div className="space-y-3">
              <div>
                <label className={fieldLabel} htmlFor="agent-display-name">
                  Display name
                </label>
                <input
                  id="agent-display-name"
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="agent-role">
                  Role
                </label>
                <input
                  id="agent-role"
                  className={inputClass}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="agent-emoji">
                  Emoji
                </label>
                <input
                  id="agent-emoji"
                  className={inputClass}
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="Optional"
                  autoComplete="off"
                />
              </div>
              <div>
                <span className={fieldLabel}>Avatar</span>
                <p className="text-sm text-slate-600 dark:text-neutral-400">
                  Click the profile photo at the top to open the gallery (same
                  picker as Suggested Agents). In the gallery, set the ring and
                  initials background to match the frame around the photo and the
                  fallback initials tile.
                </p>
                <button
                  type="button"
                  onClick={() => setAvatarPickerOpen(true)}
                  className="mt-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200 dark:hover:bg-slate-700"
                >
                  Choose avatar…
                </button>
              </div>
              <div>
                <label className={fieldLabel} htmlFor="agent-summary">
                  Short description / self-summary
                </label>
                <textarea
                  id="agent-summary"
                  className={`${inputClass} min-h-[72px] resize-y`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="agent-vibe">
                  Vibe / tone / personality
                </label>
                <textarea
                  id="agent-vibe"
                  className={`${inputClass} min-h-[64px] resize-y`}
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  rows={2}
                  placeholder="How this agent should sound…"
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="agent-objective">
                  Role &amp; objective
                </label>
                <textarea
                  id="agent-objective"
                  className={`${inputClass} min-h-[64px] resize-y`}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <span className={fieldLabel}>Agent id</span>
                <div className="flex items-center gap-2">
                  <input
                    id="agent-id"
                    readOnly
                    className={`${inputClass} font-mono text-xs`}
                    value={agent.id}
                    aria-readonly="true"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(agent.id);
                      setSaveHint("Copied id");
                      window.setTimeout(() => setSaveHint(null), 1500);
                    }}
                    className="shrink-0 rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200 dark:hover:bg-slate-700"
                  >
                    Copy
                  </button>
                </div>
                {canonicalId ? (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-neutral-500">
                    Stable runtime id — not editable (OpenClaw / workspace).
                  </p>
                ) : isCustomTeamAgentId(agent.id) ? (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-neutral-500">
                    Workspace-only id — not an OpenClaw runtime agent until
                    connected.
                  </p>
                ) : null}
              </div>
            </div>
            {saveHint ? (
              <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {saveHint}
              </p>
            ) : null}
          </section>

          {vibe.trim() ? (
            <section className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
                Personality (preview)
              </h3>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-neutral-300">
                {vibe.trim()}
              </p>
            </section>
          ) : null}

          <section className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
              Tools connected
            </h3>
            {agent.tools.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-neutral-500">
                None listed.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {agent.tools.map((t) => (
                  <li
                    key={t}
                    className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-neutral-200"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
              Assigned skills
            </h3>
            <p className="mb-3 text-xs text-slate-500 dark:text-neutral-500">
              Available skills come from the marketplace catalog below. Assign
              what this agent should use (saved with &quot;Save changes&quot;).
            </p>
            {skillIds.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-neutral-500">
                None assigned yet.
              </p>
            ) : (
              <ul className="mb-3 flex flex-wrap gap-2">
                {skillIds.map((sid) => {
                  const meta = importableSkillsMock.find((s) => s.id === sid);
                  const label = meta?.name ?? sid;
                  return (
                    <li
                      key={sid}
                      className="inline-flex items-center gap-1 rounded-full bg-sky-100 pl-3 pr-1 py-1 text-xs font-medium text-sky-900 dark:bg-sky-950/50 dark:text-sky-200"
                    >
                      <span className="inline-flex flex-wrap items-center gap-1">
                        {label}
                        {meta?.isPremium ? (
                          <PremiumSkillBadge className="shrink-0" />
                        ) : null}
                      </span>
                      <button
                        type="button"
                        className="rounded-full p-0.5 text-sky-800 hover:bg-sky-200/80 dark:text-sky-200 dark:hover:bg-sky-800/80"
                        aria-label={`Remove ${label}`}
                        onClick={() =>
                          setSkillIds((prev) => prev.filter((x) => x !== sid))
                        }
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {suggestedSkillIds.length > 0 ? (
              <div className="mb-4 rounded-xl border border-sky-200/80 bg-sky-50/50 p-3 dark:border-sky-900/40 dark:bg-sky-950/20">
                <p className="text-xs font-semibold text-sky-800 dark:text-sky-300">
                  Suggested for this role
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestedSkillIds.map((sid) => {
                    const label =
                      importableSkillsMock.find((s) => s.id === sid)?.name ??
                      sid;
                    return (
                      <button
                        key={sid}
                        type="button"
                        onClick={() => {
                          if (!skillIds.includes(sid))
                            setSkillIds((s) => [...s, sid]);
                        }}
                        disabled={skillIds.includes(sid)}
                        className="rounded-full border border-sky-300 bg-white px-2.5 py-1 text-xs font-medium text-sky-900 disabled:opacity-50 dark:border-sky-700 dark:bg-slate-900 dark:text-sky-200"
                      >
                        + {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <SkillPickerPanel
              title="Add from catalog"
              selectedIds={skillIds}
              onToggle={(id) =>
                setSkillIds((prev) =>
                  prev.includes(id)
                    ? prev.filter((x) => x !== id)
                    : [...prev, id],
                )
              }
            />
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
              Task queue
            </h3>
            {agent.taskQueue.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-neutral-500">
                No queued tasks.
              </p>
            ) : (
              <ul className="space-y-2">
                {agent.taskQueue.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <span className="min-w-0 flex-1 text-slate-800 dark:text-neutral-200">
                      {q.title}
                    </span>
                    <span className="shrink-0 text-xs font-medium capitalize text-slate-500 dark:text-neutral-400">
                      {q.state}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {agent.performanceStats.length > 0 ? (
            <section className="mb-2">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
                Performance
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {agent.performanceStats.map((p) => (
                  <div
                    key={p.label}
                    className="rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/80"
                  >
                    <p className="text-xs text-slate-500 dark:text-neutral-500">
                      {p.label}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {p.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50/90 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/90">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-100 dark:hover:bg-slate-700"
            >
              Reset to defaults
            </button>
            <button
              type="button"
              onClick={() => toastStub(`Duplicate: ${agent.name}`)}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-100 dark:hover:bg-slate-700"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={handleArchive}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
            >
              {isCustomTeamAgentId(agent.id) ? "Remove agent" : "Archive"}
            </button>
          </div>
        </div>
      </div>
    </div>

    <AgentAvatarPicker
      open={avatarPickerOpen}
      agentKey={agent.id}
      agentLabel={name.trim() || agent.name}
      selectedFilenameOverride={avatarFile}
      accentKey={accentKey}
      onAccentChange={applyAccentChoice}
      categoryLabelForAccent={agent.categoryLabel}
      onClose={() => setAvatarPickerOpen(false)}
      onChanged={applyAvatarFromPicker}
    />
    </>
  );
}
