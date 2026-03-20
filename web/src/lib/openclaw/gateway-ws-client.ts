import "server-only";

import WebSocket from "ws";

import { appendGatewayWsAuthQuery, resolveGatewayWsUrl } from "./gateway-url";
import { loadOpenClawConfig, OpenClawError } from "./client";

const PROTOCOL_VERSION = 3;

function gatewayWsTargetForLogs(): string {
  try {
    const u = resolveGatewayWsUrl();
    return u.replace(/\?.*$/, "");
  } catch {
    return "(could not resolve OPENCLAW_GATEWAY_WS_URL / OPENCLAW_BASE_URL)";
  }
}

/** Turn Node / ws TCP errors into actionable OpenClawError (debuggable in API responses). */
function asGatewaySocketError(err: unknown): OpenClawError {
  if (err instanceof OpenClawError) return err;

  const raw = err instanceof Error ? err.message : String(err);
  const target = gatewayWsTargetForLogs();

  if (/ECONNREFUSED/i.test(raw)) {
    return new OpenClawError(
      `${raw}. Target WebSocket host: ${target}. ` +
        `Nothing accepted the connection — start the OpenClaw gateway on that machine, confirm the port in its config (default is often 18789, not the same as an HTTP hooks port), ` +
        `and set gateway.bind so it listens on your LAN IP or 0.0.0.0 if Next.js runs on another computer. ` +
        `Set OPENCLAW_GATEWAY_WS_URL in web/.env to the real ws://host:port.`,
      { code: "NETWORK" },
    );
  }

  if (/ENOTFOUND|getaddrinfo/i.test(raw)) {
    return new OpenClawError(
      `${raw}. Target: ${target}. Check the hostname in OPENCLAW_GATEWAY_WS_URL / OPENCLAW_BASE_URL.`,
      { code: "NETWORK" },
    );
  }

  if (/ETIMEDOUT/i.test(raw)) {
    return new OpenClawError(
      `${raw}. Target: ${target}. Firewall or routing may be blocking TCP to the gateway port.`,
      { code: "NETWORK" },
    );
  }

  return new OpenClawError(`${raw} (gateway WebSocket target: ${target})`, { code: "NETWORK" });
}

export type GatewayWireEvent = {
  event: string;
  payload: unknown;
};

function randomId(prefix: string): string {
  const n =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${n}`;
}

type Pending = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Minimal gateway WebSocket client: JSON-RPC-style req/res + event fan-out.
 *
 * TODO: Implement real device signing when the gateway requires DEVICE_AUTH_* (not placeholder keys).
 * LAN MVP: prefer gateway.controlUi.allowInsecureAuth / pairing exceptions documented in OpenClaw.
 */
export class OpenClawGatewayWsClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private challengeNonce: string | null = null;
  private connectInFlight: Promise<void> | null = null;
  private handshakeDone = false;
  private readonly onWireEvent: (ev: GatewayWireEvent) => void;

  constructor(onWireEvent: (ev: GatewayWireEvent) => void) {
    this.onWireEvent = onWireEvent;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN && this.handshakeDone) return;
    if (!this.connectInFlight) {
      this.connectInFlight = this.doConnect()
        .then(() => {
          this.handshakeDone = true;
        })
        .finally(() => {
          this.connectInFlight = null;
        });
    }
    return this.connectInFlight;
  }

  private async doConnect(): Promise<void> {
    const config = loadOpenClawConfig();
    const token = config.gatewayToken?.trim();
    if (!token) {
      throw new OpenClawError("Missing OPENCLAW_GATEWAY_TOKEN for gateway WebSocket.", {
        code: "CONFIG",
      });
    }

    const wsUrl = appendGatewayWsAuthQuery(resolveGatewayWsUrl(), token);

    try {
      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(wsUrl, {
          handshakeTimeout: Math.min(config.timeoutMs, 30_000),
        });
        this.ws = socket;

        socket.once("open", () => {
          socket.on("message", (data) => {
            this.handleIncoming(data.toString());
          });
          socket.on("close", (code, reason) => {
            this.rejectAllPending(
              new OpenClawError(`Gateway WebSocket closed (${code}): ${reason.toString()}`, {
                code: "NETWORK",
              }),
            );
          });
          socket.on("error", () => {
            // 'error' also precedes 'close'
          });
          resolve();
        });

        socket.once("error", (err) => {
          reject(asGatewaySocketError(err));
        });
      });

      await this.performConnectHandshake(token, config.timeoutMs);
    } catch (err) {
      this.close();
      throw asGatewaySocketError(err);
    }
  }

  private rejectAllPending(err: Error) {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pending.clear();
  }

  private sendJson(obj: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new OpenClawError("Gateway WebSocket is not connected.", { code: "NETWORK" });
    }
    this.ws.send(JSON.stringify(obj));
  }

  private handleIncoming(text: string) {
    let msg: unknown;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object") return;
    const m = msg as Record<string, unknown>;

    if (m.type === "res" && typeof m.id === "string") {
      const p = this.pending.get(m.id);
      if (p) {
        clearTimeout(p.timer);
        this.pending.delete(m.id);
        if (m.ok === true) p.resolve(m.payload);
        else {
          const errObj =
            m.error && typeof m.error === "object" && m.error !== null
              ? (m.error as Record<string, unknown>)
              : null;
          const errMsg = typeof errObj?.message === "string" ? errObj.message : "Gateway error";
          p.reject(new OpenClawError(errMsg, { code: "UPSTREAM_HTTP" }));
        }
      }
      return;
    }

    if (m.type === "event" && typeof m.event === "string") {
      if (m.event === "connect.challenge" && m.payload && typeof m.payload === "object") {
        const nonce = (m.payload as Record<string, unknown>).nonce;
        if (typeof nonce === "string" && nonce.length > 0) {
          this.challengeNonce = nonce;
        }
      }
      this.onWireEvent({ event: m.event, payload: m.payload });
      return;
    }

    if (typeof m.type === "string" && m.type !== "req" && m.type !== "res") {
      this.onWireEvent({ event: `legacy.${m.type}`, payload: m });
    }
  }

  private async performConnectHandshake(token: string, timeoutMs: number): Promise<void> {
    await new Promise((r) => setTimeout(r, 120));

    const params: Record<string, unknown> = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: "gateway-client",
        version: "0.0.1",
        platform: "nodejs",
        mode: "backend",
      },
      role: "operator",
      scopes: ["operator.read", "operator.write"],
      caps: [],
      commands: [],
      permissions: {},
      auth: { token },
      locale: "en-US",
      userAgent: "nojo-openclaw-bridge/1.0",
    };

    if (this.challengeNonce) {
      params.device = {
        id: "nojo-bridge-device",
        publicKey: "nojo-placeholder",
        signature: "nojo-placeholder",
        signedAt: Date.now(),
        nonce: this.challengeNonce,
      };
    }

    await this.request("connect", params, undefined, Math.max(timeoutMs, 15_000));
  }

  request(method: string, params?: unknown, idOverride?: string, timeoutMs?: number): Promise<unknown> {
    const config = loadOpenClawConfig();
    const ms = timeoutMs ?? config.timeoutMs;
    const id = idOverride ?? randomId("req");

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new OpenClawError(`Gateway request timed out: ${method}`, { code: "TIMEOUT" }));
      }, ms);

      this.pending.set(id, {
        resolve,
        reject,
        timer,
      });

      try {
        this.sendJson({ type: "req", id, method, params: params ?? {} });
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  close() {
    this.rejectAllPending(new OpenClawError("Gateway WebSocket closed by client.", { code: "NETWORK" }));
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
    this.handshakeDone = false;
    this.challengeNonce = null;
  }
}
