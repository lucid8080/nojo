import "server-only";

import WebSocket from "ws";

import { appendGatewayWsAuthQuery, resolveGatewayWsUrl } from "./gateway-url";
import { loadOpenClawConfig, OpenClawError } from "./client";
import { buildDeviceAuthPayloadV2 } from "./openclaw-device-auth";
import {
  loadOrCreateOpenClawDeviceIdentity,
  loadOpenClawDeviceToken,
  storeOpenClawDeviceToken,
  signDevicePayload,
} from "./openclaw-device-identity";

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
  private challengeNoncePromise: Promise<string> | null = null;
  private challengeNonceResolve: ((nonce: string) => void) | null = null;
  private connectInFlight: Promise<void> | null = null;
  private handshakeDone = false;
  private readonly onWireEvent: (ev: GatewayWireEvent) => void;

  constructor(onWireEvent: (ev: GatewayWireEvent) => void) {
    this.onWireEvent = onWireEvent;
    this.resetChallengeWaiter();
  }

  private resetChallengeWaiter() {
    this.challengeNoncePromise = new Promise<string>((resolve) => {
      this.challengeNonceResolve = resolve;
    });
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
          const gatewayCode = typeof errObj?.code === "string" ? errObj.code : undefined;

          // Include gateway error code in the message so callers can pattern-match
          // for DEVICE_AUTH_* / PAIRING_REQUIRED diagnostics.
          const message = gatewayCode ? `${gatewayCode}: ${errMsg}` : errMsg;
          p.reject(new OpenClawError(message, { code: "UPSTREAM_HTTP" }));
        }
      }
      return;
    }

    if (m.type === "event" && typeof m.event === "string") {
      if (m.event === "connect.challenge" && m.payload && typeof m.payload === "object") {
        const nonce = (m.payload as Record<string, unknown>).nonce;
        if (typeof nonce === "string" && nonce.length > 0) {
          this.challengeNonce = nonce;
          this.challengeNonceResolve?.(nonce);
          this.challengeNonceResolve = null;
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

    const nonce = await this.waitForConnectChallengeNonce(Math.min(timeoutMs, 10_000));

    // Device identity must be persisted server-side so `device.id` and `device.publicKey`
    // remain stable across reconnects (required for gateway DEVICE_AUTH_* checks).
    const {
      identity: deviceIdentity,
      loadedFromDisk: identityLoadedFromDisk,
      identityPath,
    } = await loadOrCreateOpenClawDeviceIdentity();

    const role = "operator";
    const scopes = ["operator.read", "operator.write"];

    // Optional: if the gateway issues a per-device token, we persist and send it back.
    // Signature verification still uses `auth.token` (shared gateway token) because we
    // always set it. This avoids signature payload token mismatches.
    const existingDeviceToken = await loadOpenClawDeviceToken({
      deviceId: deviceIdentity.deviceId,
      role,
    });
    const deviceTokenFoundOnDisk = typeof existingDeviceToken === "string" && existingDeviceToken.length > 0;

    // Keep runtime logs safe: never log private keys, raw tokens, or signatures.
    const debugBase = {
      deviceId: deviceIdentity.deviceId,
      identityPath,
      identityLoadedFromDisk,
      deviceTokenFoundOnDisk,
    };

    const params: Record<string, unknown> = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: { id: "gateway-client", version: "0.0.1", platform: "nodejs", mode: "backend" },
      role,
      scopes,
      caps: [],
      commands: [],
      permissions: {},
      auth: existingDeviceToken ? { token, deviceToken: existingDeviceToken } : { token },
      locale: "en-US",
      userAgent: "nojo-openclaw-bridge/1.0",
    };

    const signedAtMs = Date.now();

    // OpenClaw device signature payload format is deterministic and must match the gateway's
    // reconstruction exactly (see OpenClaw `buildDeviceAuthPayload` for v2 field ordering).
    const devicePayload = buildDeviceAuthPayloadV2({
      deviceId: deviceIdentity.deviceId,
      clientId: String((params.client as Record<string, unknown>).id),
      clientMode: String((params.client as Record<string, unknown>).mode),
      role: String(params.role),
      scopes: (params.scopes as unknown[]).map((s) => String(s)),
      signedAtMs,
      token,
      nonce,
    });

    const signature = await signDevicePayload(deviceIdentity.privateKey, devicePayload);

    // Include the signed device identity payload in the connect request.
    // Do not send placeholders: these values must be derived from our persisted keypair.
    (params as Record<string, unknown>).device = {
      id: deviceIdentity.deviceId,
      publicKey: deviceIdentity.publicKey,
      signature,
      signedAt: signedAtMs,
      nonce,
    };

    try {
      const hello = await this.request(
        "connect",
        params,
        undefined,
        Math.max(timeoutMs, 15_000),
      );

      // hello-ok example shape:
      // { type: "hello-ok", auth: { deviceToken?: string, role?: string, scopes?: string[] } }
      if (hello && typeof hello === "object") {
        const o = hello as Record<string, unknown>;
        const auth = (o.auth && typeof o.auth === "object" ? (o.auth as Record<string, unknown>) : null);
        const deviceToken = typeof auth?.deviceToken === "string" ? auth.deviceToken : undefined;
        const helloRole = typeof auth?.role === "string" ? auth.role : undefined;
        const scopesRaw = Array.isArray(auth?.scopes) ? auth.scopes : undefined;

        const helloReturnedDeviceToken =
          typeof deviceToken === "string" && deviceToken.length > 0 && typeof helloRole === "string";

        let helloStoredDeviceToken = false;

        if (helloReturnedDeviceToken) {
          const scopes =
            scopesRaw?.map((s) => (typeof s === "string" ? s : "")).filter((s) => s.length > 0) ?? undefined;

          try {
            await storeOpenClawDeviceToken({
              deviceId: deviceIdentity.deviceId,
              role: helloRole,
              token: deviceToken,
              scopes,
            });
            helloStoredDeviceToken = true;
          } catch {
            // best-effort; keep connection success independent from persistence failure
          }
        }

        console.info("[openclaw-device-auth]", {
          ...debugBase,
          helloReturnedDeviceToken,
          helloStoredDeviceToken,
        });
      }
    } catch (err) {
      // If the gateway rejects because this brand-new device isn't approved yet, surface
      // actionable pairing steps to the caller (generated identity is server-side only).
      const msg = err instanceof Error ? err.message : String(err);
      const looksLikePairingRequired =
        /PAIRING_REQUIRED/i.test(msg) ||
        /pairing required/i.test(msg) ||
        /DEVICE_IDENTITY_REQUIRED/i.test(msg) ||
        /device identity required/i.test(msg);

      if (looksLikePairingRequired) {
        throw new OpenClawError(
          `OpenClaw rejected this device identity and requires pairing/approval.\n` +
            `Generated deviceId: ${deviceIdentity.deviceId}\n\n` +
            `One-time step (run against your OpenClaw gateway):\n` +
            `1) openclaw devices list\n` +
            `2) Find the pending request for role=operator and this deviceId\n` +
            `3) openclaw devices approve <requestId>\n\n` +
            `Then retry the chat connection.`,
          { code: "BAD_REQUEST" },
        );
      }

      throw err;
    }
  }

  private async waitForConnectChallengeNonce(timeoutMs: number): Promise<string> {
    if (this.challengeNonce && this.challengeNonce.length > 0) return this.challengeNonce;
    if (!this.challengeNoncePromise) {
      throw new OpenClawError("Missing connect.challenge promise state.", { code: "NETWORK" });
    }

    return await new Promise<string>((resolve, reject) => {
      const t = setTimeout(() => {
        reject(new OpenClawError(`Timed out waiting for connect.challenge nonce.`, { code: "TIMEOUT" }));
      }, timeoutMs);

      this.challengeNoncePromise
        ?.then((n) => {
          clearTimeout(t);
          resolve(n);
        })
        .catch((e) => {
          clearTimeout(t);
          reject(e instanceof Error ? e : new Error(String(e)));
        });
    });
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
    this.resetChallengeWaiter();
  }
}
