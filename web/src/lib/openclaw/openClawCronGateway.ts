import "server-only";

/**
 * OpenClaw Gateway cron mutations (canonical scheduler).
 *
 * Nojo does not persist reminders in its own database. Scheduled work lives in the OpenClaw Gateway
 * cron store (~/.openclaw/cron/jobs.json on the host). The app lists jobs via HTTP GET on the
 * gateway (`/api/cron` / `/cron`) or a local JSON mirror — see `cronJobsBundle` and
 * `listOpenClawCronJobsFromGateway`. Creation/update/removal must go through Gateway RPC (`cron.*`).
 */

import { OpenClawError } from "./client";
import { OpenClawGatewayWsClient } from "./gateway-ws-client";

/** Default scopes for `cron.add` / other cron mutations (gateway requires `operator.admin`). */
export const DEFAULT_CRON_GATEWAY_SCOPES = [
  "operator.read",
  "operator.write",
  "operator.admin",
] as const;

/**
 * Scopes for the short-lived WS client used only on the server for OpenClaw cron RPCs.
 * Override with env `NOJO_OPENCLAW_CRON_GATEWAY_SCOPES` (comma-separated). The gateway may require
 * the device to be approved for `operator.admin` — see `.env.example`.
 */
export function getCronGatewayScopesFromEnv(): string[] {
  const raw = process.env.NOJO_OPENCLAW_CRON_GATEWAY_SCOPES?.trim();
  if (!raw) return [...DEFAULT_CRON_GATEWAY_SCOPES];
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : [...DEFAULT_CRON_GATEWAY_SCOPES];
}

/** Subset of OpenClaw `cron.add` body — see https://docs.openclaw.ai/automation/cron-jobs */
export type OpenClawCronAddPayload = {
  name: string;
  schedule: {
    kind: "at";
    at: string;
  };
  sessionTarget: string;
  wakeMode?: "now" | "next-heartbeat";
  payload:
    | { kind: "systemEvent"; text: string }
    | { kind: "agentTurn"; message: string; lightContext?: boolean };
  deleteAfterRun?: boolean;
  agentId?: string;
  description?: string;
  enabled?: boolean;
  delivery?: { mode: "none" | "announce" | "webhook" };
};

export type OpenClawCronAddResult = {
  raw: unknown;
  jobId?: string;
};

function extractJobId(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const id =
    (typeof o.jobId === "string" && o.jobId.trim()) ||
    (typeof o.id === "string" && o.id.trim());
  return id || undefined;
}

/**
 * Create a cron job on the OpenClaw Gateway via WebSocket `cron.add`.
 * Opens a short-lived connection, performs device handshake, invokes RPC, then closes.
 * Uses broader gateway scopes than chat (`operator.admin`) — server-side only, not end-user facing.
 */
export async function callOpenClawCronAdd(
  payload: OpenClawCronAddPayload,
  opts?: { timeoutMs?: number },
): Promise<OpenClawCronAddResult> {
  const client = new OpenClawGatewayWsClient(
    () => {
      /* no streaming events needed */
    },
    { gatewayScopes: getCronGatewayScopesFromEnv() },
  );
  const timeoutMs = opts?.timeoutMs ?? 45_000;

  try {
    await client.connect();
    const raw = await client.request("cron.add", payload, undefined, timeoutMs);
    return { raw, jobId: extractJobId(raw) };
  } catch (err) {
    if (err instanceof OpenClawError) throw err;
    throw new OpenClawError(err instanceof Error ? err.message : String(err), {
      code: "NETWORK",
    });
  } finally {
    try {
      client.close();
    } catch {
      // ignore
    }
  }
}
