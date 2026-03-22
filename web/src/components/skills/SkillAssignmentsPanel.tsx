"use client";

import { useWorkspaceRosterFromContext } from "@/components/providers/WorkspaceRosterProvider";
import { useHasMounted } from "@/lib/hooks/useHasMounted";
import { normalizeAgentKey } from "@/lib/agentAvatars";
import { NOJO_WORKSPACE_AGENTS } from "@/data/nojoWorkspaceRoster";
import {
  NOJO_AGENT_IDENTITY_CHANGED,
  mergeWorkspaceRosterEntry,
  patchOverride,
  readOverrides,
} from "@/lib/nojo/agentIdentityOverrides";
import {
  mergeSeedWithCustomRosterEntries,
  NOJO_TEAM_WORKSPACE_CHANGED,
  readCustomRoster,
} from "@/lib/nojo/teamWorkspaceStore";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export function SkillAssignmentsPanel({
  canonicalSkillId,
}: {
  canonicalSkillId: string;
}) {
  const [refresh, setRefresh] = useState(0);
  const [assignToId, setAssignToId] = useState("");
  const { customAgents, loading } = useWorkspaceRosterFromContext();
  const hasMounted = useHasMounted();

  useEffect(() => {
    setRefresh(1);
  }, []);

  const bump = useCallback(() => setRefresh((r) => r + 1), []);

  useEffect(() => {
    window.addEventListener(NOJO_AGENT_IDENTITY_CHANGED, bump);
    window.addEventListener(NOJO_TEAM_WORKSPACE_CHANGED, bump);
    return () => {
      window.removeEventListener(NOJO_AGENT_IDENTITY_CHANGED, bump);
      window.removeEventListener(NOJO_TEAM_WORKSPACE_CHANGED, bump);
    };
  }, [bump]);

  const roster = useMemo(() => {
    const effective =
      hasMounted && customAgents.length > 0
        ? customAgents
        : hasMounted && loading
          ? readCustomRoster()
          : [];
    return mergeSeedWithCustomRosterEntries(NOJO_WORKSPACE_AGENTS, effective);
  }, [hasMounted, customAgents, loading]);

  const { assignedAgents, availableToAssign } = useMemo(() => {
    const overrides = readOverrides();
    const withSkill: { id: string; displayName: string }[] = [];
    const without: { id: string; displayName: string }[] = [];

    for (const entry of roster) {
      const key = normalizeAgentKey(entry.id);
      const o = overrides[key];
      const merged = mergeWorkspaceRosterEntry(entry, o);
      const ids = o?.assignedSkillIds ?? [];
      const has = ids.includes(canonicalSkillId);
      const displayName = merged.name.trim() || entry.id;
      if (has) {
        withSkill.push({ id: entry.id, displayName });
      } else {
        without.push({ id: entry.id, displayName });
      }
    }
    without.sort((a, b) => a.displayName.localeCompare(b.displayName));
    withSkill.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { assignedAgents: withSkill, availableToAssign: without };
  }, [roster, canonicalSkillId, refresh]);

  const handleAssign = () => {
    if (!assignToId) return;
    const key = normalizeAgentKey(assignToId);
    const prev = readOverrides()[key]?.assignedSkillIds ?? [];
    if (prev.includes(canonicalSkillId)) return;
    patchOverride(assignToId, {
      assignedSkillIds: [...prev, canonicalSkillId],
    });
    setAssignToId("");
  };

  const handleRemove = (agentId: string) => {
    const key = normalizeAgentKey(agentId);
    const prev = readOverrides()[key]?.assignedSkillIds ?? [];
    patchOverride(agentId, {
      assignedSkillIds: prev.filter((x) => x !== canonicalSkillId),
    });
  };

  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-neutral-100">
        Agents using this skill
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-neutral-500">
        Assignments are saved in this browser (
        <Link
          href="/team"
          className="font-medium text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
        >
          Team
        </Link>
        ).
      </p>

      {assignedAgents.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-neutral-400">
          No agents have this skill assigned yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {assignedAgents.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-neutral-50/80 px-3 py-2 dark:border-slate-600/80 dark:bg-slate-800/50"
            >
              <span className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-neutral-100">
                {a.displayName}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(a.id)}
                className="shrink-0 rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-neutral-100 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200 dark:hover:bg-slate-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-neutral-200/80 pt-4 dark:border-slate-700/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
          Assign to agent
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="skill-assign-agent">
            Choose agent
          </label>
          <select
            id="skill-assign-agent"
            value={assignToId}
            onChange={(e) => setAssignToId(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="">Select an agent…</option>
            {availableToAssign.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!assignToId || availableToAssign.length === 0}
            onClick={handleAssign}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Assign
          </button>
        </div>
        {availableToAssign.length === 0 && assignedAgents.length > 0 ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-neutral-500">
            All roster agents already have this skill.
          </p>
        ) : null}
      </div>
    </section>
  );
}
