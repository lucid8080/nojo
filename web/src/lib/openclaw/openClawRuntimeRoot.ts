import "server-only";

import path from "node:path";

function getEnvTrim(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

/**
 * Canonical on-disk directory for Nojo-managed OpenClaw runtime data (agents, cron mirror, device keys).
 *
 * Precedence: `NOJO_OPENCLAW_RUNTIME_ROOT` → `OPENCLAW_RUNTIME_ROOT` → `process.cwd()/.openclaw`
 */
export function getOpenClawRuntimeRoot(): string {
  const explicit =
    getEnvTrim("NOJO_OPENCLAW_RUNTIME_ROOT") ?? getEnvTrim("OPENCLAW_RUNTIME_ROOT");
  if (explicit) {
    return path.resolve(explicit);
  }
  return path.resolve(process.cwd(), ".openclaw");
}

/**
 * Root directory under which per-agent workspaces live (`{agentId}/workspace/...`).
 * Precedence: `OPENCLAW_AGENTS_ROOT` → `OPENCLAW_AGENT_WORKSPACES_ROOT` → `{runtimeRoot}/agents`
 */
export function getConfiguredRuntimeAgentsRoot(): string {
  const explicit =
    getEnvTrim("OPENCLAW_AGENTS_ROOT") ?? getEnvTrim("OPENCLAW_AGENT_WORKSPACES_ROOT");
  if (explicit) {
    return path.resolve(explicit);
  }
  return path.join(getOpenClawRuntimeRoot(), "agents");
}

const DEVICE_IDENTITY_FILE = "openclaw-device-identity-v1.json";
const DEVICE_TOKEN_FILE = "openclaw-device-token-v1.json";

export function resolveDefaultOpenClawDeviceIdentityPath(): string {
  return path.join(getOpenClawRuntimeRoot(), DEVICE_IDENTITY_FILE);
}

export function resolveDefaultOpenClawDeviceTokenPath(): string {
  return path.join(getOpenClawRuntimeRoot(), DEVICE_TOKEN_FILE);
}

/**
 * Candidate paths for a **local mirror** of cron job JSON (UI fallback only). The Schedules API
 * prefers the live OpenClaw gateway (`GET` on `OPENCLAW_BASE_URL`, e.g. `/api/cron`) as canonical.
 *
 * Order: `OPENCLAW_CRON_JOBS_PATH` → `{runtimeRoot}/cron/jobs.json` → `cwd/.openclaw/cron/jobs.json` if distinct.
 */
export function getOpenClawCronJobsPathCandidates(): string[] {
  const out: string[] = [];
  const env = getEnvTrim("OPENCLAW_CRON_JOBS_PATH");
  if (env) {
    out.push(path.resolve(env));
  }
  const runtimeCron = path.join(getOpenClawRuntimeRoot(), "cron", "jobs.json");
  out.push(runtimeCron);
  const cwdCron = path.join(process.cwd(), ".openclaw", "cron", "jobs.json");
  if (path.resolve(cwdCron) !== path.resolve(runtimeCron)) {
    out.push(cwdCron);
  }
  return out;
}
