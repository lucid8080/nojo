import "server-only";

import {
  OpenClawHookError,
  type OpenClawHookRequest,
  type OpenClawThinking,
  sendToOpenClaw,
} from "./sendToOpenClaw";

type OpenClawConfig = {
  baseUrl: string;
  /** Used for health and other gateway endpoints. */
  gatewayToken?: string;
  /** Used for POST /hooks/agent only. Do not assume same as gateway. */
  hooksToken?: string;
  timeoutMs: number;
};

type OpenClawErrorCode =
  | "CONFIG"
  | "BAD_REQUEST"
  | "TIMEOUT"
  | "NETWORK"
  | "UPSTREAM_HTTP"
  | "UPSTREAM_PARSE";

export class OpenClawError extends Error {
  public readonly code: OpenClawErrorCode;
  public readonly status?: number;
  public readonly upstreamBodyText?: string;

  constructor(
    message: string,
    opts: { code: OpenClawErrorCode; status?: number; upstreamBodyText?: string },
  ) {
    super(message);
    this.name = "OpenClawError";
    this.code = opts.code;
    this.status = opts.status;
    this.upstreamBodyText = opts.upstreamBodyText;
  }
}

function getEnv(name: string) {
  const v = process.env[name];
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

function normalizeBaseUrl(rawBaseUrl: string) {
  const trimmed = rawBaseUrl.trim();
  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  // Validate URL shape early so errors are clear.
  // eslint-disable-next-line no-new
  new URL(withoutTrailingSlash);
  return withoutTrailingSlash;
}

export function loadOpenClawConfig(): OpenClawConfig {
  const baseUrlRaw = getEnv("OPENCLAW_BASE_URL");
  if (!baseUrlRaw) {
    throw new OpenClawError("Missing OPENCLAW_BASE_URL.", { code: "CONFIG" });
  }

  let baseUrl: string;
  try {
    baseUrl = normalizeBaseUrl(baseUrlRaw);
  } catch {
    throw new OpenClawError("Invalid OPENCLAW_BASE_URL (must be a valid URL).", {
      code: "CONFIG",
    });
  }

  const timeoutMsRaw = getEnv("OPENCLAW_TIMEOUT_MS");
  const timeoutMs =
    timeoutMsRaw && Number.isFinite(Number(timeoutMsRaw))
      ? Math.max(1, Number(timeoutMsRaw))
      : 8000;

  const gatewayToken = getEnv("OPENCLAW_GATEWAY_TOKEN") ?? getEnv("OPENCLAW_API_TOKEN");
  const hooksToken = getEnv("OPENCLAW_HOOKS_TOKEN") ?? getEnv("OPENCLAW_API_TOKEN");

  return { baseUrl, gatewayToken, hooksToken, timeoutMs };
}

async function readResponseBody(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("application/json")) {
    try {
      return await res.json();
    } catch {
      const text = await res.text().catch(() => "");
      throw new OpenClawError("Failed to parse upstream JSON response.", {
        code: "UPSTREAM_PARSE",
        status: res.status,
        upstreamBodyText: text,
      });
    }
  }

  return await res.text();
}

type OpenClawRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  headers?: Record<string, string | undefined>;
  body?: unknown;
  /** Use "hooks" for /hooks/agent (hooks token). Default "gateway" for health etc. */
  authMode?: "gateway" | "hooks";
};

async function openclawRequest<T>(opts: OpenClawRequestOptions): Promise<{
  status: number;
  data: T;
}> {
  const config = loadOpenClawConfig();
  const url = `${config.baseUrl}${opts.path.startsWith("/") ? "" : "/"}${
    opts.path
  }`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  const headers: Record<string, string> = {
    accept: "application/json, text/plain;q=0.9, */*;q=0.8",
  };

  const authMode = opts.authMode ?? "gateway";
  const token =
    authMode === "hooks" ? config.hooksToken : config.gatewayToken;
  if (token) {
    if (authMode === "hooks") {
      headers.authorization = `Bearer ${token}`;
      headers["x-openclaw-token"] = token;
    } else {
      headers.authorization = `Bearer ${token}`;
    }
  }

  for (const [k, v] of Object.entries(opts.headers ?? {})) {
    if (typeof v === "string" && v.trim() !== "") headers[k.toLowerCase()] = v;
  }

  let body: string | undefined;
  if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers["content-type"] = headers["content-type"] ?? "application/json";
  }

  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    const data = (await readResponseBody(res)) as T;

    if (!res.ok) {
      const upstreamBodyText =
        typeof data === "string" ? data : JSON.stringify(data);
      throw new OpenClawError("Upstream OpenClaw request failed.", {
        code: "UPSTREAM_HTTP",
        status: res.status,
        upstreamBodyText,
      });
    }

    return { status: res.status, data };
  } catch (err) {
    if (err instanceof OpenClawError) throw err;

    if (err instanceof DOMException && err.name === "AbortError") {
      throw new OpenClawError("OpenClaw request timed out.", { code: "TIMEOUT" });
    }

    const message = err instanceof Error ? err.message : String(err);
    throw new OpenClawError(`OpenClaw request failed: ${message}`, {
      code: "NETWORK",
    });
  } finally {
    clearTimeout(timeout);
  }
}

type OpenClawHealthResult = {
  endpoint: string;
  status: number;
  data: unknown;
};

// Assumptions (isolated): common health endpoints used by services.
const HEALTH_PATH_CANDIDATES = ["/api/health", "/health"];

export async function checkHealth(): Promise<OpenClawHealthResult> {
  let lastError: unknown;

  for (const path of HEALTH_PATH_CANDIDATES) {
    try {
      const res = await openclawRequest<unknown>({ path, method: "GET" });
      return { endpoint: path, status: res.status, data: res.data };
    } catch (err) {
      lastError = err;
      // Try next candidate path if upstream returns 404.
      if (err instanceof OpenClawError && err.code === "UPSTREAM_HTTP") {
        if (err.status === 404) continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new OpenClawError("OpenClaw health check failed.", { code: "NETWORK" });
}

export type CreateRunPayload = {
  /** UI sends prompt; mapped to message for OpenClaw /hooks/agent. */
  prompt: string;
  agentId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
  /** Optional fields for /hooks/agent. */
  name?: string;
  model?: string;
  thinking?: OpenClawThinking;
  timeoutSeconds?: number;
};

type HooksAgentUpstreamResponse = {
  runId?: string;
  id?: string;
  status?: string;
  message?: string;
  [k: string]: unknown;
};

export type CreateRunResult = {
  success: boolean;
  status?: string;
  message?: string;
  /** True if upstream returned 2xx (async accept). No REST runId guaranteed. */
  upstreamAccepted: boolean;
  runId?: string;
  raw?: unknown;
};

function pickRunId(data: HooksAgentUpstreamResponse | unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as HooksAgentUpstreamResponse;
  const candidates: unknown[] = [
    d.runId,
    d.id,
    (d as Record<string, unknown>).run_id,
    (d as Record<string, unknown>).uuid,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim() !== "") return c;
  }

  return undefined;
}

/** Single place: map UI prompt to OpenClaw /hooks/agent body. Minimal required: message. */
function buildHooksAgentBody(
  payload: CreateRunPayload,
): OpenClawHookRequest {
  const body: OpenClawHookRequest = {
    message: payload.prompt,
  };
  if (payload.name != null && payload.name !== "") body.name = payload.name;
  if (payload.agentId != null && payload.agentId !== "") body.agentId = payload.agentId;
  if (payload.model != null && payload.model !== "") body.model = payload.model;
  if (payload.thinking != null) body.thinking = payload.thinking;
  if (
    payload.timeoutSeconds != null &&
    Number.isFinite(Number(payload.timeoutSeconds))
  )
    body.timeoutSeconds = Number(payload.timeoutSeconds);
  return body;
}

function sanitizeSafeRaw(data: unknown): unknown | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;
  // Minimal safety: strip keys that could contain secrets.
  const forbidden = new Set([
    "token",
    "access_token",
    "api_token",
    "authorization",
    "auth",
    "password",
    "secret",
    "key",
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const lower = k.toLowerCase();
    if (forbidden.has(lower)) continue;
    out[k] = v;
  }
  const hasMeaningfulFields =
    Object.keys(out).length > 0 && (out.runId || out.id || out.status || out.message);
  return hasMeaningfulFields ? out : undefined;
}

const HOOKS_AGENT_PATH = "/hooks/agent";

export async function createRun(payload: CreateRunPayload): Promise<CreateRunResult> {
  const config = loadOpenClawConfig();
  if (!config.hooksToken) {
    throw new OpenClawError(
      "Missing OPENCLAW_HOOKS_TOKEN. POST /hooks/agent requires hooks auth.",
      { code: "CONFIG" },
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.timeoutMs,
    );

    try {
      const res = await sendToOpenClaw(buildHooksAgentBody(payload), {
        baseUrl: config.baseUrl,
        token: config.hooksToken,
        signal: controller.signal,
      });

      const runId = pickRunId(res.data as HooksAgentUpstreamResponse);
      const status =
        typeof (res.data as HooksAgentUpstreamResponse | undefined)?.status ===
        "string"
          ? (res.data as HooksAgentUpstreamResponse).status
          : undefined;
      const message =
        typeof (res.data as HooksAgentUpstreamResponse | undefined)?.message ===
        "string"
          ? (res.data as HooksAgentUpstreamResponse).message
          : undefined;

      return {
        success: true,
        status,
        message,
        upstreamAccepted: res.status >= 200 && res.status < 300,
        runId,
        raw: sanitizeSafeRaw(res.data),
      };
    } catch (err) {
      if (err instanceof OpenClawHookError) {
        const upstreamBodyText =
          typeof err.data === "string" ? err.data : JSON.stringify(err.data);
        throw new OpenClawError("Upstream OpenClaw request failed.", {
          code: "UPSTREAM_HTTP",
          status: err.status,
          upstreamBodyText,
        });
      }

      if (err instanceof DOMException && err.name === "AbortError") {
        throw new OpenClawError("OpenClaw request timed out.", {
          code: "TIMEOUT",
        });
      }

      if (err instanceof OpenClawError) throw err;

      const message = err instanceof Error ? err.message : String(err);
      throw new OpenClawError(`OpenClaw request failed: ${message}`, {
        code: "NETWORK",
      });
    } finally {
      clearTimeout(timeout);
    }

  } catch (err) {
    if (err instanceof OpenClawError) throw err;
    throw new OpenClawError("OpenClaw create run failed.", { code: "NETWORK" });
  }
}

export type GetRunStatusResult = {
  runId: string;
  status?: string;
  message?: string;
  raw?: unknown;
};

function pickRunStatus(data: unknown): { status?: string; message?: string } {
  if (!data || typeof data !== "object") return {};
  const d = data as Record<string, unknown>;

  const statusCandidates = [d.status, d.state, d.runStatus, d.execution_status];
  const status = statusCandidates.find((v) => typeof v === "string" && v.trim() !== "") as
    | string
    | undefined;

  const messageCandidates = [d.message, d.error, d.detail, d.reason];
  const message = messageCandidates.find(
    (v) => typeof v === "string" && v.trim() !== "",
  ) as string | undefined;

  return { status, message };
}

// PROVISIONAL: guessed paths; no standard REST run lifecycle for this OpenClaw setup.
const RUN_STATUS_PATH_CANDIDATES = (runId: string) => [
  `/api/runs/${encodeURIComponent(runId)}/status`,
  `/api/runs/${encodeURIComponent(runId)}`,
  `/runs/${encodeURIComponent(runId)}/status`,
  `/runs/${encodeURIComponent(runId)}`,
];

/**
 * PROVISIONAL: This OpenClaw instance does not expose a REST run-status API.
 * Status is via WebSocket/CLI. These HTTP paths are guessed and may not exist.
 */
export async function getRunStatus(runId: string): Promise<GetRunStatusResult> {
  const cleaned = typeof runId === "string" ? runId.trim() : "";
  if (!cleaned) {
    throw new OpenClawError("Missing runId.", { code: "BAD_REQUEST" });
  }

  let lastError: unknown;

  for (const path of RUN_STATUS_PATH_CANDIDATES(cleaned)) {
    try {
      const res = await openclawRequest<unknown>({ path, method: "GET" });
      const picked = pickRunStatus(res.data);

      return {
        runId: cleaned,
        status: picked.status,
        message: picked.message,
        raw: sanitizeSafeRaw(res.data),
      };
    } catch (err) {
      lastError = err;
      // If path doesn't exist, try the next candidate.
      if (err instanceof OpenClawError && err.code === "UPSTREAM_HTTP") {
        if (err.status === 404) continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new OpenClawError("OpenClaw getRunStatus failed.", { code: "NETWORK" });
}

export type GetRunLogsResult = {
  runId: string;
  logs: string[];
  message?: string;
  raw?: unknown;
};

/** Normalize upstream response to an array of displayable log lines. */
function normalizeLogsResponse(data: unknown): string[] {
  if (data == null) return [];

  if (typeof data === "string") {
    return data.trim() ? data.split(/\r?\n/).filter((s) => s.length > 0) : [];
  }

  if (Array.isArray(data)) {
    return data.map((entry) => {
      if (entry == null) return "";
      if (typeof entry === "string") return entry;
      if (typeof entry === "object") {
        const o = entry as Record<string, unknown>;
        const msg = o.message ?? o.text ?? o.content ?? o.log ?? o.line;
        if (typeof msg === "string") {
          const ts = o.timestamp ?? o.time ?? o.ts;
          return typeof ts === "string" ? `[${ts}] ${msg}` : msg;
        }
        try {
          return JSON.stringify(o);
        } catch {
          return String(entry);
        }
      }
      return String(entry);
    }).filter((s) => s.length > 0);
  }

  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    const arr = o.logs ?? o.events ?? o.messages ?? o.entries ?? o.lines;
    if (Array.isArray(arr)) return normalizeLogsResponse(arr);
    const text = o.text ?? o.output ?? o.content ?? o.body;
    if (typeof text === "string") return normalizeLogsResponse(text);
    try {
      return [JSON.stringify(o)];
    } catch {
      return [];
    }
  }

  return [];
}

// PROVISIONAL: guessed paths.
const RUN_LOGS_PATH_CANDIDATES = (runId: string) => [
  `/api/runs/${encodeURIComponent(runId)}/logs`,
  `/runs/${encodeURIComponent(runId)}/logs`,
  `/api/runs/${encodeURIComponent(runId)}/log`,
  `/runs/${encodeURIComponent(runId)}/log`,
];

/**
 * PROVISIONAL: Logs are via WebSocket/CLI for this instance. These HTTP paths are guessed.
 */
export async function getRunLogs(runId: string): Promise<GetRunLogsResult> {
  const cleaned = typeof runId === "string" ? runId.trim() : "";
  if (!cleaned) {
    throw new OpenClawError("Missing runId.", { code: "BAD_REQUEST" });
  }

  let lastError: unknown;

  for (const path of RUN_LOGS_PATH_CANDIDATES(cleaned)) {
    try {
      const res = await openclawRequest<unknown>({ path, method: "GET" });
      const logs = normalizeLogsResponse(res.data);
      const rawMsg = (res.data as Record<string, unknown>)?.message;
      const message =
        typeof rawMsg === "string" && rawMsg.trim() !== "" ? rawMsg : undefined;

      return {
        runId: cleaned,
        logs,
        message,
        raw: sanitizeSafeRaw(res.data),
      };
    } catch (err) {
      lastError = err;
      if (err instanceof OpenClawError && err.code === "UPSTREAM_HTTP") {
        if (err.status === 404) continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new OpenClawError("OpenClaw getRunLogs failed.", { code: "NETWORK" });
}

export type CancelRunResult = {
  runId: string;
  status?: string;
  message?: string;
  raw?: unknown;
};

// PROVISIONAL: cancel is via WebSocket/CLI; these HTTP paths are guessed.
function getCancelMethodAndPaths(runId: string): { method: "POST" | "DELETE"; path: string }[] {
  const id = encodeURIComponent(runId);
  return [
    { method: "POST", path: `/api/runs/${id}/cancel` },
    { method: "POST", path: `/runs/${id}/cancel` },
    { method: "DELETE", path: `/api/runs/${id}` },
    { method: "DELETE", path: `/runs/${id}` },
  ];
}

/**
 * PROVISIONAL: Cancel is via WebSocket/CLI for this instance. These HTTP paths are guessed.
 */
export async function cancelRun(runId: string): Promise<CancelRunResult> {
  const cleaned = typeof runId === "string" ? runId.trim() : "";
  if (!cleaned) {
    throw new OpenClawError("Missing runId.", { code: "BAD_REQUEST" });
  }

  let lastError: unknown;

  for (const { method, path } of getCancelMethodAndPaths(cleaned)) {
    try {
      const res = await openclawRequest<unknown>({
        path,
        method,
        ...(method === "POST" ? { body: {} } : {}),
      });
      const d = res.data as Record<string, unknown>;
      const rawMsg = d?.message ?? d?.error;
      const message =
        typeof rawMsg === "string" && rawMsg.trim() !== "" ? rawMsg : undefined;
      const status =
        typeof d?.status === "string" && d.status.trim() !== ""
          ? d.status
          : undefined;

      return {
        runId: cleaned,
        status,
        message,
        raw: sanitizeSafeRaw(res.data),
      };
    } catch (err) {
      lastError = err;
      if (err instanceof OpenClawError && err.code === "UPSTREAM_HTTP") {
        if (err.status === 404 || err.status === 405) continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new OpenClawError("OpenClaw cancelRun failed.", { code: "NETWORK" });
}

