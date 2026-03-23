import "server-only";

import { extractUserVisibleMessageFromNojoGatewayText } from "@/lib/nojo/extractUserVisibleChatMessage";
import { OpenClawGatewayWsClient, type GatewayWireEvent } from "./gateway-ws-client";
import { buildWorkspaceGatewaySessionKey } from "./gateway-session-key";
import { OpenClawError } from "./client";

export type OpenClawChatBridgeEvent =
  | { type: "ready"; sessionKey: string }
  | {
      type: "history";
      entries: Array<{
        role: "user" | "assistant";
        text: string;
        idempotencyKey?: string;
      }>;
    }
  | { type: "delta"; runId: string; text: string }
  | { type: "final"; runId: string; text: string; stopReason?: string }
  | { type: "aborted"; runId: string; text?: string }
  | { type: "status"; phase: string; detail?: string }
  | { type: "error"; message: string; code?: string; runId?: string };

function extractAssistantText(message: unknown): string {
  if (message == null) return "";
  if (typeof message === "string") return message;
  if (typeof message === "object" && message !== null) {
    const o = message as Record<string, unknown>;
    const direct = o.text ?? o.content ?? o.body ?? o.delta ?? o.thinking;
    if (typeof direct === "string") return direct;
    const fromParts = (parts: unknown): string => {
      if (!Array.isArray(parts)) return "";
      return parts
        .map((c) => {
          if (typeof c === "string") return c;
          if (c && typeof c === "object") {
            const p = c as Record<string, unknown>;
            if (typeof p.text === "string") return p.text;
            if (p.content != null) return extractAssistantText(p.content);
          }
          return "";
        })
        .join("");
    };
    if (Array.isArray(o.content)) {
      return o.content
        .map((c) => {
          if (typeof c === "string") return c;
          if (c && typeof c === "object") {
            const p = c as Record<string, unknown>;
            if (typeof p.text === "string") return p.text;
            if (typeof p.type === "string" && p.text != null) {
              return extractAssistantText(p.text);
            }
          }
          return "";
        })
        .join("");
    }
    if (Array.isArray(o.parts)) {
      return fromParts(o.parts);
    }
  }
  return "";
}

/**
 * History rows may nest text under `parts` / `thinking` while `message` is a truthy empty object.
 * Try several shapes and return the first non-empty string.
 */
function extractHistoryItemText(o: Record<string, unknown>): string {
  const nested =
    o.message && typeof o.message === "object" ? (o.message as Record<string, unknown>) : null;
  const candidates: unknown[] = [
    o.text,
    o.parts,
    o.content,
    o.thinking,
    o.delta,
    o.summary,
    o.output,
    o.message,
    nested?.parts,
    nested?.content,
    nested?.text,
    nested?.thinking,
    o,
  ];
  for (const c of candidates) {
    if (c == null) continue;
    const t = extractAssistantText(c);
    if (t.trim()) return t;
  }
  return "";
}

/**
 * Map gateway / OpenAI-style transcript roles into workspace UI lanes.
 * `tool` / `system` / `function` map to assistant so OpenClaw history (often tool-heavy) rehydrates.
 */
function mapRoleString(roleRaw: string | null): "user" | "assistant" | null {
  if (!roleRaw) return null;
  const r = roleRaw.toLowerCase();
  if (r === "assistant" || r === "model" || r === "agent") return "assistant";
  if (r === "user" || r === "human") return "user";
  if (r === "tool" || r === "system" || r === "function" || r === "developer") return "assistant";
  return null;
}

function isChatEventPayload(p: unknown): p is {
  runId: string;
  sessionKey: string;
  state: "delta" | "final" | "aborted" | "error";
  message?: unknown;
  errorMessage?: string;
  stopReason?: string;
} {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.runId === "string" &&
    typeof o.sessionKey === "string" &&
    (o.state === "delta" ||
      o.state === "final" ||
      o.state === "aborted" ||
      o.state === "error")
  );
}

const HISTORY_ARRAY_KEYS = [
  "messages",
  "entries",
  "history",
  "lines",
  "items",
  "events",
  "transcript",
  "turns",
] as const;

function findFirstMessageArray(root: Record<string, unknown>): unknown[] | null {
  for (const k of HISTORY_ARRAY_KEYS) {
    const v = root[k];
    if (Array.isArray(v)) return v;
  }
  return null;
}

/**
 * Peel gateway envelopes (data / payload / result) until we find a message array or top-level array.
 */
function peelToMessageArray(data: unknown): unknown[] | null {
  let cur: unknown = data;
  for (let depth = 0; depth < 4; depth++) {
    if (Array.isArray(cur)) return cur;
    if (!cur || typeof cur !== "object") return null;
    const o = cur as Record<string, unknown>;
    const direct = findFirstMessageArray(o);
    if (direct) return direct;
    const next = o.data ?? o.payload ?? o.result;
    if (next != null && typeof next === "object") {
      cur = next;
      continue;
    }
    return null;
  }
  return Array.isArray(cur) ? cur : null;
}

/**
 * Normalize OpenClaw / gateway history RPC payloads into UI-ready chat lines.
 * Exported for unit tests.
 */
export function normalizeHistoryPayload(
  data: unknown,
): Array<{ role: "user" | "assistant"; text: string; idempotencyKey?: string }> {
  const raw = peelToMessageArray(data);
  if (!raw) return [];

  const out: Array<{ role: "user" | "assistant"; text: string; idempotencyKey?: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const nested =
      o.message && typeof o.message === "object" ? (o.message as Record<string, unknown>) : null;

    const asRoleStr = (v: unknown): string | null =>
      typeof v === "string" ? v : typeof v === "number" ? String(v) : null;

    const typeRaw = asRoleStr(o.type);
    const typeAsRole =
      typeRaw && !/^(message|conversation|event|generic)$/i.test(typeRaw.trim()) ? typeRaw : null;

    const roleRaw =
      asRoleStr(o.role) ??
      asRoleStr(o.kind) ??
      (nested ? asRoleStr(nested.role) : null) ??
      (nested ? asRoleStr(nested.kind) : null) ??
      typeAsRole;

    const role = mapRoleString(roleRaw);
    if (!role) continue;

    let text = extractHistoryItemText(o);
    if (!text.trim()) continue;
    if (role === "user") {
      text = extractUserVisibleMessageFromNojoGatewayText(text);
    }

    // Best-effort: upstream history may include an idempotency key, client message id,
    // or other stable message identifier. We only use it for optimistic dedupe.
    const idempotencyKey =
      (typeof o.idempotencyKey === "string" && o.idempotencyKey.trim() !== ""
        ? o.idempotencyKey.trim()
        : undefined) ??
      (typeof o.idempotency_key === "string" && o.idempotency_key.trim() !== ""
        ? o.idempotency_key.trim()
        : undefined) ??
      (typeof o.idempotency === "string" && o.idempotency.trim() !== "" ? o.idempotency.trim() : undefined) ??
      (nested &&
      typeof nested.idempotencyKey === "string" &&
      nested.idempotencyKey.trim() !== ""
        ? nested.idempotencyKey.trim()
        : undefined) ??
      (nested &&
      typeof nested.idempotency_key === "string" &&
      nested.idempotency_key.trim() !== ""
        ? nested.idempotency_key.trim()
        : undefined);

    out.push({ role, text, idempotencyKey });
  }
  return out;
}

const HISTORY_RPC_METHODS = ["chat.history", "sessions.history", "session/history"] as const;
const HISTORY_PER_ATTEMPT_MS = 8_000;

type HistoryEntry = { role: "user" | "assistant"; text: string; idempotencyKey?: string };

/**
 * Try several gateway history RPCs and parameter shapes; return the first non-empty normalized transcript.
 */
async function loadHistoryWithFallback(
  client: OpenClawGatewayWsClient,
  sessionKey: string,
): Promise<HistoryEntry[]> {
  const keyPrefix = sessionKey.length > 80 ? `${sessionKey.slice(0, 80)}…` : sessionKey;
  let lastError: string | undefined;

  const paramVariants: Array<{
    label: "sessionKey" | "key";
    build: (key: string) => Record<string, unknown>;
  }> = [
    { label: "sessionKey", build: (key) => ({ sessionKey: key, limit: 200 }) },
    { label: "key", build: (key) => ({ key, limit: 200 }) },
  ];

  for (const method of HISTORY_RPC_METHODS) {
    for (const { label, build } of paramVariants) {
      // Gateway rejects `key` for chat.history; only sessionKey is valid there.
      if (method === "chat.history" && label === "key") continue;
      try {
        const hist = await client.request(method, build(sessionKey), undefined, HISTORY_PER_ATTEMPT_MS);
        const entries = normalizeHistoryPayload(hist);
        if (entries.length > 0) {
          console.info("[openclaw-qa][stream.history]", {
            ok: true,
            method,
            entryCount: entries.length,
            sessionKeyPrefix: keyPrefix,
          });
          return entries;
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  console.info("[openclaw-qa][stream.history]", {
    ok: false,
    reason: "all_history_methods_failed_or_empty",
    sessionKeyPrefix: keyPrefix,
    lastError,
  });
  return [];
}

const bridgeByKey = new Map<string, OpenClawRoomBridge>();

function requireAgentPart(agentId: string | undefined): string {
  const agentPart = agentId?.trim() ?? "";
  if (!agentPart) {
    throw new Error("Missing agentId for OpenClaw room bridge.");
  }
  return agentPart;
}

export function getOpenClawRoomBridge(opts: {
  userId: string;
  conversationId: string;
  agentId?: string;
}): OpenClawRoomBridge {
  const agentPart = requireAgentPart(opts.agentId);
  const key = `${opts.userId}::${opts.conversationId}::${agentPart}`;
  let b = bridgeByKey.get(key);
  if (!b) {
    b = new OpenClawRoomBridge(opts);
    bridgeByKey.set(key, b);
  }
  return b;
}

export function releaseOpenClawRoomBridge(
  userId: string,
  conversationId: string,
  agentId?: string,
): void {
  const agentPart = agentId?.trim() ?? "";
  if (!agentPart) {
    return;
  }
  bridgeByKey.delete(`${userId}::${conversationId}::${agentPart}`);
}

/**
 * One OpenClaw gateway WebSocket per (user, conversation), fan-out to many SSE subscribers.
 */
export class OpenClawRoomBridge {
  readonly sessionKey: string;
  private readonly userId: string;
  private readonly conversationId: string;
  private readonly agentId?: string;

  private client: OpenClawGatewayWsClient | null = null;
  private subscribers = new Set<(ev: OpenClawChatBridgeEvent) => void>();
  private refCount = 0;
  private disposeTimer: ReturnType<typeof setTimeout> | null = null;
  private deltaTextByRun = new Map<string, string>();
  private subscribeSent = false;
  /** In-flight shared promise so concurrent SSE subscribers coalesce one gateway fetch + one emit. */
  private historyFetchInFlight: Promise<HistoryEntry[]> | null = null;

  constructor(opts: { userId: string; conversationId: string; agentId?: string }) {
    this.userId = opts.userId;
    this.conversationId = opts.conversationId;
    this.agentId = opts.agentId;
    this.sessionKey = buildWorkspaceGatewaySessionKey({
      userId: opts.userId,
      conversationId: opts.conversationId,
      agentId: opts.agentId,
    });
  }

  subscribe(cb: (ev: OpenClawChatBridgeEvent) => void): () => void {
    this.refCount += 1;
    if (this.disposeTimer) {
      clearTimeout(this.disposeTimer);
      this.disposeTimer = null;
    }
    this.subscribers.add(cb);
    void this.bootstrapUpstream()
      .then(() => {
        cb({ type: "ready", sessionKey: this.sessionKey });
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        cb({ type: "error", message: msg, code: "BRIDGE_CONNECT" });
      });
    return () => {
      this.subscribers.delete(cb);
      this.refCount = Math.max(0, this.refCount - 1);
      this.scheduleDispose();
    };
  }

  private scheduleDispose() {
    if (this.refCount > 0) return;
    if (this.disposeTimer) clearTimeout(this.disposeTimer);
    this.disposeTimer = setTimeout(() => {
      if (this.refCount > 0) return;
      this.teardownUpstream();
      releaseOpenClawRoomBridge(this.userId, this.conversationId, this.agentId);
    }, 45_000);
  }

  private teardownUpstream() {
    try {
      this.client?.close();
    } catch {
      // ignore
    }
    this.client = null;
    this.subscribeSent = false;
    this.historyFetchInFlight = null;
    this.deltaTextByRun.clear();
  }

  private emit(ev: OpenClawChatBridgeEvent) {
    for (const s of this.subscribers) {
      try {
        s(ev);
      } catch {
        // ignore subscriber errors
      }
    }
  }

  private onGatewayEvent(ev: GatewayWireEvent) {
    if (ev.event === "connect.challenge") return;

    const p = ev.payload;
    if (isChatEventPayload(p) && p.sessionKey === this.sessionKey) {
      const textChunk = extractAssistantText(p.message);
      if (p.state === "delta") {
        const prev = this.deltaTextByRun.get(p.runId) ?? "";
        const next = prev + textChunk;
        this.deltaTextByRun.set(p.runId, next);
        this.emit({ type: "delta", runId: p.runId, text: next });
        return;
      }
      if (p.state === "final") {
        const buf = this.deltaTextByRun.get(p.runId) ?? "";
        const finalText = textChunk || buf;
        this.deltaTextByRun.delete(p.runId);
        this.emit({
          type: "final",
          runId: p.runId,
          text: finalText,
          stopReason: typeof p.stopReason === "string" ? p.stopReason : undefined,
        });
        return;
      }
      if (p.state === "aborted") {
        const buf = this.deltaTextByRun.get(p.runId) ?? "";
        this.deltaTextByRun.delete(p.runId);
        this.emit({ type: "aborted", runId: p.runId, text: buf || textChunk || undefined });
        return;
      }
      if (p.state === "error") {
        this.deltaTextByRun.delete(p.runId);
        this.emit({
          type: "error",
          runId: p.runId,
          message: typeof p.errorMessage === "string" ? p.errorMessage : "Chat error",
          code: "CHAT_EVENT",
        });
        return;
      }
    }

    if (ev.event.startsWith("legacy.") && p && typeof p === "object") {
      const leg = p as Record<string, unknown>;
      const t = leg.type;
      if (t === "tool_call" || t === "tool_result") {
        const tool = typeof leg.tool === "string" ? leg.tool : "tool";
        this.emit({ type: "status", phase: String(t), detail: tool });
      }
      if (t === "response" && leg.payload && typeof leg.payload === "object") {
        const pay = leg.payload as Record<string, unknown>;
        const txt = extractAssistantText(pay.text ?? pay);
        if (txt) {
          const rid = typeof leg.id === "string" ? leg.id : "legacy";
          this.emit({ type: "final", runId: rid, text: txt });
        }
      }
    }
  }

  private async bootstrapUpstream(): Promise<void> {
    if (!this.client) {
      this.client = new OpenClawGatewayWsClient((ev) => this.onGatewayEvent(ev));
    }
    await this.client.connect();

    if (!this.subscribeSent) {
      this.subscribeSent = true;
      try {
        await this.client.request(
          "sessions.messages.subscribe",
          { key: this.sessionKey },
          undefined,
          12_000,
        );
      } catch {
        // Some gateways only support chat.* — ignore subscribe failure.
      }
    }

    await this.loadHistoryForCurrentSubscribers();
  }

  /**
   * Every SSE subscribe runs bootstrapUpstream; we must load (or join) history each time so
   * reconnects/refreshes are not skipped when the bridge is reused (cleared dispose timer).
   * Emit happens inside the shared fetch so concurrent bootstraps only fan out one history event.
   */
  private async loadHistoryForCurrentSubscribers(): Promise<void> {
    if (!this.client) return;

    if (!this.historyFetchInFlight) {
      this.historyFetchInFlight = (async () => {
        const entries = await loadHistoryWithFallback(this.client!, this.sessionKey);
        if (entries.length) {
          this.emit({ type: "history", entries });
        }
        return entries;
      })();
      void this.historyFetchInFlight.finally(() => {
        this.historyFetchInFlight = null;
      });
    }

    await this.historyFetchInFlight;
  }

  async sendUserMessage(text: string, idempotencyKey: string): Promise<void> {
    await this.bootstrapUpstream();
    if (!this.client) {
      throw new OpenClawError("Gateway client missing after connect.", { code: "NETWORK" });
    }
    await this.client.request(
      "chat.send",
      {
        sessionKey: this.sessionKey,
        message: text,
        idempotencyKey,
        deliver: true,
      },
      undefined,
      120_000,
    );
  }
}
