/**
 * Browser-local user edits for Nojo agents. Git-tracked `nojoWorkspaceRoster.ts` is the seed;
 * this map is the canonical overlay until a backend exists.
 */

import type { TeamWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import {
  normalizeAgentKey,
  readAgentAvatarMap,
  defaultAvatarFilename,
  getAgentAvatarFilename,
  setAgentAvatarFilename,
} from "@/lib/agentAvatars";

export const NOJO_AGENT_IDENTITY_STORAGE_KEY = "nojoAgentIdentityOverridesV1";
const STORAGE_KEY = NOJO_AGENT_IDENTITY_STORAGE_KEY;
const AVATAR_MIGRATION_FLAG = "nojoAgentIdentityMigratedAvatarV1";

export const NOJO_AGENT_IDENTITY_CHANGED = "nojo-agent-identity-changed";

/** Fields the user can override (all optional when stored). */
export type NojoAgentIdentityOverride = {
  name?: string;
  role?: string;
  initials?: string;
  categoryLabel?: string;
  description?: string;
  objective?: string;
  vibe?: string;
  emoji?: string;
  /** Filename only, e.g. `3.png` */
  avatarFile?: string;
  /** Palette key for avatar ring / initials, e.g. `sky` */
  avatarAccent?: string;
  /** Skill ids: `importableSkillsMock` (`sk-*`) and/or agency catalog ids from `agencyAgents.json`. */
  assignedSkillIds?: string[];
};

export type NojoAgentIdentityOverrideMap = Record<string, NojoAgentIdentityOverride>;

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isOverrideValue(v: unknown): v is NojoAgentIdentityOverride {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const allowed = [
    "name",
    "role",
    "initials",
    "categoryLabel",
    "description",
    "objective",
    "vibe",
    "emoji",
    "avatarFile",
    "avatarAccent",
    "assignedSkillIds",
  ];
  for (const k of Object.keys(o)) {
    if (!allowed.includes(k)) return false;
    if (k === "assignedSkillIds") {
      if (!isStringArray(o[k])) return false;
    } else if (o[k] !== undefined && typeof o[k] !== "string") {
      return false;
    }
  }
  return true;
}

function readOverridesRaw(): NojoAgentIdentityOverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: NojoAgentIdentityOverrideMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === "string" && isOverrideValue(v)) {
        out[normalizeAgentKey(k)] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeOverridesRaw(map: NojoAgentIdentityOverrideMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function migrateLegacyAvatarsOnce() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(AVATAR_MIGRATION_FLAG)) return;
  const overrides = readOverridesRaw();
  const avatarMap = readAgentAvatarMap();
  let changed = false;
  for (const [id, file] of Object.entries(avatarMap)) {
    const key = normalizeAgentKey(id);
    const cur = overrides[key] ?? {};
    if (cur.avatarFile === undefined && file) {
      overrides[key] = { ...cur, avatarFile: file };
      changed = true;
    }
  }
  if (changed) writeOverridesRaw(overrides);
  window.localStorage.setItem(AVATAR_MIGRATION_FLAG, "1");
}

/** Full override map (keys normalized). Runs one-time avatar-map → identity migration. */
export function readOverrides(): NojoAgentIdentityOverrideMap {
  migrateLegacyAvatarsOnce();
  return readOverridesRaw();
}

export function writeOverrides(map: NojoAgentIdentityOverrideMap) {
  writeOverridesRaw(map);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOJO_AGENT_IDENTITY_CHANGED));
  }
}

export function patchOverride(
  agentId: string,
  partial: NojoAgentIdentityOverride,
): NojoAgentIdentityOverrideMap {
  const key = normalizeAgentKey(agentId);
  const map = readOverrides();
  const prev = map[key] ?? {};
  const next: NojoAgentIdentityOverride = { ...prev, ...partial };
  for (const k of Object.keys(next) as (keyof NojoAgentIdentityOverride)[]) {
    const v = next[k];
    if (v === "") delete next[k];
    if (k === "assignedSkillIds" && Array.isArray(v) && v.length === 0) {
      delete next[k];
    }
  }
  if (Object.keys(next).length === 0) {
    const { [key]: _, ...rest } = map;
    writeOverrides(rest);
    setAgentAvatarFilename(agentId, null);
    return rest;
  }
  map[key] = next;
  writeOverrides(map);
  if ("avatarFile" in partial) {
    setAgentAvatarFilename(agentId, next.avatarFile ?? null);
  }
  return map;
}

/** Remove all overrides for this agent (back to roster seed). */
export function clearOverride(agentId: string): NojoAgentIdentityOverrideMap {
  const key = normalizeAgentKey(agentId);
  const map = readOverrides();
  const { [key]: _, ...rest } = map;
  writeOverrides(rest);
  setAgentAvatarFilename(agentId, null);
  return rest;
}

export function mergeWorkspaceRosterEntry(
  entry: TeamWorkspaceRosterEntry,
  override?: NojoAgentIdentityOverride | null,
): TeamWorkspaceRosterEntry {
  if (!override) return entry;
  return {
    id: entry.id,
    name: override.name !== undefined ? override.name : entry.name,
    role: override.role !== undefined ? override.role : entry.role,
    initials: override.initials !== undefined ? override.initials : entry.initials,
    avatarClass: entry.avatarClass,
    categoryLabel:
      override.categoryLabel !== undefined
        ? override.categoryLabel
        : entry.categoryLabel,
  };
}

export function mergeWorkspaceRosterList(
  roster: readonly TeamWorkspaceRosterEntry[],
  overrides?: NojoAgentIdentityOverrideMap | null,
): TeamWorkspaceRosterEntry[] {
  const map = overrides ?? {};
  return roster.map((e) =>
    mergeWorkspaceRosterEntry(e, map[normalizeAgentKey(e.id)]),
  );
}

/** Resolved avatar filename for Team UI and storage sync. */
export function resolveAgentAvatarFile(
  agentId: string,
  fallbackFilename: string,
): string {
  const key = normalizeAgentKey(agentId);
  const fromIdentity = readOverrides()[key]?.avatarFile;
  if (fromIdentity) return fromIdentity;
  return getAgentAvatarFilename(agentId) ?? fallbackFilename;
}

