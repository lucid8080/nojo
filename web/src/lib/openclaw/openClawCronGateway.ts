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
import { resolveGatewayWsUrl } from "./gateway-url";
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

export type OpenClawCronRpcSourceMeta = {
  source: "openclaw_gateway_rpc";
  transport: "ws";
  method: "cron.add" | "cron.list" | "cron.status";
  sourceDetail: string;
  scopes: string[];
};

export type OpenClawCronListResult = OpenClawCronRpcSourceMeta & {
  method: "cron.list";
  raw: unknown;
};

export type OpenClawCronStatusResult = OpenClawCronRpcSourceMeta & {
  method: "cron.status";
  raw: unknown;
};

function extractJobId(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const id =
    (typeof o.jobId === "string" && o.jobId.trim()) ||
    (typeof o.id === "string" && o.id.trim());
  return id || undefined;
}

function getGatewayRpcSourceDetail(): string {
  try {
    return resolveGatewayWsUrl().replace(/\?.*$/, "");
  } catch {
    return "(could not resolve OPENCLAW_GATEWAY_WS_URL / OPENCLAW_BASE_URL)";
  }
}

function normalizeCronGatewayError(method: "cron.add" | "cron.list" | "cron.status", err: unknown): OpenClawError {
  if (err instanceof OpenClawError) return err;
  const message = err instanceof Error ? err.message : String(err);
  const code = /timed?\s*out/i.test(message) ? "TIMEOUT" : "NETWORK";
  return new OpenClawError(`${method} failed: ${message}`, { code });
}

async function callOpenClawCronRpc(
  method: "cron.add" | "cron.list" | "cron.status",
  params: unknown,
  timeoutMs: number,
): Promise<{ raw: unknown; sourceDetail: string; scopes: string[] }> {
  const scopes = getCronGatewayScopesFromEnv();
  const client = new OpenClawGatewayWsClient(
    () => {
      /* no streaming events needed */
    },
    { gatewayScopes: scopes },
  );

  try {
    await client.connect();
    const raw = await client.request(method, params, undefined, timeoutMs);
    return { raw, sourceDetail: getGatewayRpcSourceDetail(), scopes };
  } catch (err) {
    throw normalizeCronGatewayError(method, err);
  } finally {
    try {
      client.close();
    } catch {
      // ignore
    }
  }
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
  const timeoutMs = opts?.timeoutMs ?? 45_000;

  try {
    const rpc = await callOpenClawCronRpc("cron.add", payload, timeoutMs);
    const raw = rpc.raw;
    return { raw, jobId: extractJobId(raw) };
  } catch (err) {
    throw normalizeCronGatewayError("cron.add", err);
  }
}

export async function callOpenClawCronList(opts?: {
  timeoutMs?: number;
  params?: Record<string, unknown>;
}): Promise<OpenClawCronListResult> {
  const timeoutMs = opts?.timeoutMs ?? 20_000;
  const rpc = await callOpenClawCronRpc("cron.list", opts?.params ?? {}, timeoutMs);
  return {
    source: "openclaw_gateway_rpc",
    transport: "ws",
    method: "cron.list",
    sourceDetail: rpc.sourceDetail,
    scopes: rpc.scopes,
    raw: rpc.raw,
  };
}

export async function callOpenClawCronStatus(
  params: Record<string, unknown> = {},
  opts?: { timeoutMs?: number },
): Promise<OpenClawCronStatusResult> {
  const timeoutMs = opts?.timeoutMs ?? 20_000;
  const rpc = await callOpenClawCronRpc("cron.status", params, timeoutMs);
  return {
    source: "openclaw_gateway_rpc",
    transport: "ws",
    method: "cron.status",
    sourceDetail: rpc.sourceDetail,
    scopes: rpc.scopes,
    raw: rpc.raw,
  };
}
