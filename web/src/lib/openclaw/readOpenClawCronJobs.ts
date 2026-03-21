import "server-only";

import { promises as fs } from "node:fs";

import { extractCronJobsArrayFromUnknown } from "./normalizeOpenClawCronJobs";
import { getOpenClawCronJobsPathCandidates } from "./openClawRuntimeRoot";
import type { ReadOpenClawCronJobsResult } from "./openClawCronTypes";

function isENOENT(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as NodeJS.ErrnoException).code === "ENOENT"
  );
}

/**
 * Reads a **local mirror** of cron job definitions (JSON). Not authoritative when the OpenClaw
 * gateway is available; the Schedules API prefers the gateway cron list on `OPENCLAW_BASE_URL` first.
 */
export async function readOpenClawCronJobsFromDisk(): Promise<ReadOpenClawCronJobsResult> {
  const candidates = getOpenClawCronJobsPathCandidates();
  const unique = [...new Set(candidates)];
  const warnings: string[] = [];
  let lastErr: string | null = null;

  for (const resolvedPath of unique) {
    try {
      const text = await fs.readFile(resolvedPath, "utf8");
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          ok: false,
          resolvedPath,
          error: `Invalid JSON in cron store: ${msg}`,
          warnings,
        };
      }
      const jobsRaw = extractCronJobsArrayFromUnknown(parsed);
      return { ok: true, resolvedPath, jobsRaw, warnings };
    } catch (e) {
      if (isENOENT(e)) {
        lastErr = `File not found: ${resolvedPath}`;
        continue;
      }
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        resolvedPath,
        error: `Failed to read cron store: ${msg}`,
        warnings,
      };
    }
  }

  return {
    ok: false,
    resolvedPath: unique[unique.length - 1] ?? "(none)",
    error:
      lastErr ??
      `No OpenClaw cron jobs file found. Set OPENCLAW_CRON_JOBS_PATH or add cron/jobs.json under the OpenClaw runtime root (see NOJO_OPENCLAW_RUNTIME_ROOT). Tried: ${unique.join(", ")}`,
    warnings,
  };
}

const SENSITIVE_KEYS = new Set([
  "token",
  "access_token",
  "api_token",
  "authorization",
  "auth",
  "password",
  "secret",
  "privateKey",
  "private_key",
]);

/** Deep-clone JSON-safe structures and strip sensitive keys from objects (best-effort). */
export function sanitizeJsonForClient(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeJsonForClient(v));
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) continue;
      out[k] = sanitizeJsonForClient(v);
    }
    return out;
  }
  return String(value);
}
