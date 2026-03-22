export type AgentAvatarMap = Record<string, string>;

const STORAGE_KEY = "agentAvatarMapV1";
/** Number of default avatar files (`1.png` … `${n}.png`) under `/avatar/`. */
export const DEFAULT_AVATAR_COUNT = 18;

export function normalizeAgentKey(input: string) {
  return input.trim().toLowerCase();
}

function hashString(input: string) {
  // small, stable non-crypto hash for deterministic defaults
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function defaultAvatarFilename(agentKey: string) {
  const key = normalizeAgentKey(agentKey);
  const idx = (hashString(key) % DEFAULT_AVATAR_COUNT) + 1;
  return `${idx}.png`;
}

/**
 * Stable avatar URL for SSR and the first client paint (ignores localStorage overrides).
 * Use this until after hydration, then `getAgentAvatarUrl` can apply user picks.
 */
export function getDefaultAgentAvatarUrl(agentKey: string) {
  return `/avatar/${encodeURIComponent(defaultAvatarFilename(agentKey))}`;
}

export function readAgentAvatarMap(): AgentAvatarMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: AgentAvatarMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === "string" && typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeAgentAvatarMap(map: AgentAvatarMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getAgentAvatarFilename(agentKey: string) {
  const key = normalizeAgentKey(agentKey);
  const map = readAgentAvatarMap();
  return map[key] ?? null;
}

export function getAgentAvatarUrl(agentKey: string, opts?: { withDefault?: boolean }) {
  const filename = getAgentAvatarFilename(agentKey);
  const resolved = filename ?? (opts?.withDefault ? defaultAvatarFilename(agentKey) : null);
  return resolved ? `/avatar/${encodeURIComponent(resolved)}` : null;
}

export function setAgentAvatarFilename(agentKey: string, filename: string | null) {
  const key = normalizeAgentKey(agentKey);
  const map = readAgentAvatarMap();
  if (!filename) {
    delete map[key];
  } else {
    map[key] = filename;
  }
  writeAgentAvatarMap(map);
}

/** Light pastel ring/frame behind avatar image (inside white ring). */
export const AVATAR_ACCENT_BG = [
  "bg-sky-200",
  "bg-violet-200",
  "bg-emerald-200",
  "bg-amber-200",
  "bg-rose-200",
] as const;

/** Initials fallback: light fill + readable text. */
export const AVATAR_FALLBACK_SURFACE = [
  "bg-sky-200 text-sky-900",
  "bg-violet-200 text-violet-900",
  "bg-emerald-200 text-emerald-900",
  "bg-amber-200 text-amber-950",
  "bg-rose-200 text-rose-900",
] as const;

export function getAvatarAccentClasses(label: string) {
  const key = normalizeAgentKey(label);
  const i = hashString(key) % AVATAR_ACCENT_BG.length;
  return {
    frame: AVATAR_ACCENT_BG[i]!,
    fallback: AVATAR_FALLBACK_SURFACE[i]!,
  };
}

