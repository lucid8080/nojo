import "server-only";

import { loadOpenClawConfig, OpenClawError } from "./client";

/**
 * Ensure a value is a valid ws/wss URL. If there is no `scheme://`, prepends `ws://`
 * so values like `192.168.1.5:18789` work (common .env mistake).
 */
function normalizeToWebSocketHref(raw: string, envHint: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new OpenClawError(`${envHint} is empty.`, { code: "CONFIG" });
  }

  let candidate = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//u.test(candidate)) {
    candidate = `ws://${candidate}`;
  }

  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    throw new OpenClawError(
      `${envHint} is not a valid URL (value: "${trimmed.slice(0, 160)}"). ` +
        `Use a full URL, e.g. ws://192.168.1.10:18789 or https://openclaw.example.com — or host:port only (ws:// is added automatically).`,
      { code: "CONFIG" },
    );
  }

  if (u.protocol === "http:") u.protocol = "ws:";
  else if (u.protocol === "https:") u.protocol = "wss:";
  else if (u.protocol !== "ws:" && u.protocol !== "wss:") {
    throw new OpenClawError(
      `${envHint} must be ws:, wss:, or http(s): (got ${u.protocol}).`,
      { code: "CONFIG" },
    );
  }

  return u.href.replace(/\/+$/, "");
}

/** WebSocket URL for the OpenClaw gateway control plane (distinct from HTTP base in some installs). */
export function resolveGatewayWsUrl(): string {
  const override = process.env.OPENCLAW_GATEWAY_WS_URL?.trim();
  if (override) {
    return normalizeToWebSocketHref(override, "OPENCLAW_GATEWAY_WS_URL");
  }

  const { baseUrl } = loadOpenClawConfig();
  return normalizeToWebSocketHref(baseUrl, "OPENCLAW_BASE_URL");
}

export function appendGatewayWsAuthQuery(wsUrl: string, token: string): string {
  try {
    const u = new URL(wsUrl);
    u.searchParams.set("token", token);
    return u.toString();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new OpenClawError(
      `Invalid gateway WebSocket URL when adding auth query (${detail}). Check OPENCLAW_GATEWAY_WS_URL / OPENCLAW_BASE_URL.`,
      { code: "CONFIG" },
    );
  }
}
