import "server-only";

export type OpenClawThinking = "low" | "medium" | "high";

export type OpenClawChannel =
  | "last"
  | "whatsapp"
  | "telegram"
  | "discord"
  | "slack"
  | "mattermost"
  | "signal"
  | "imessage"
  | "msteams";

export interface OpenClawHookRequest {
  message: string;
  name?: string;
  agentId?: string;
  sessionKey?: string;
  wakeMode?: "now" | "next-heartbeat";
  deliver?: boolean;
  channel?: OpenClawChannel;
  to?: string;
  model?: string;
  thinking?: OpenClawThinking;
  timeoutSeconds?: number;
}

export interface OpenClawHookResult {
  ok: boolean;
  status: number;
  data: unknown;
}

class OpenClawHookError extends Error {
  public readonly status: number;
  public readonly data: unknown;

  constructor(message: string, opts: { status: number; data: unknown }) {
    super(message);
    this.name = "OpenClawHookError";
    this.status = opts.status;
    this.data = opts.data;
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

export async function sendToOpenClaw(
  body: OpenClawHookRequest,
  opts?: {
    baseUrl?: string;
    token?: string;
    signal?: AbortSignal;
  },
): Promise<OpenClawHookResult> {
  const baseUrlRaw =
    opts?.baseUrl ?? getEnv("OPENCLAW_BASE_URL") ?? "http://192.168.0.109:7070";

  const baseUrl = normalizeBaseUrl(baseUrlRaw);
  const token = opts?.token ?? getEnv("OPENCLAW_HOOKS_TOKEN") ?? getEnv("OPENCLAW_API_TOKEN");

  if (!token) {
    throw new Error("Missing OpenClaw hooks token");
  }

  const url = `${baseUrl}/hooks/agent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      // Compatibility: some OpenClaw deployments also accept/require this header.
      "x-openclaw-token": token,
    },
    body: JSON.stringify(body),
    signal: opts?.signal,
    cache: "no-store",
  });

  let data: unknown = null;
  const text = await res.text();

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new OpenClawHookError(`OpenClaw hook failed (${res.status}).`, {
      status: res.status,
      data,
    });
  }

  return {
    ok: true,
    status: res.status,
    data,
  };
}

export { OpenClawHookError };

