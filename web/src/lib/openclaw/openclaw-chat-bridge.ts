import "server-only";

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
    const direct = o.text ?? o.content ?? o.body ?? o.delta;
    if (typeof direct === "string") return direct;
    if (Array.isArray(o.content)) {
      return o.content
        .map((c) => {
          if (typeof c === "string") return c;
          if (c && typeof c === "object") {
            const p = c as Record<string, unknown>;
            if (typeof p.text === "string") return p.text;
          }
          return "";
        })
        .join("");
    }
  }
  return "";
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

function normalizeHistoryPayload(
  data: unknown,
): Array<{ role: "user" | "assistant"; text: string; idempotencyKey?: string }> {
  if (!data || typeof data !== "object") return [];
  const root = data as Record<string, unknown>;
  const raw =
    root.messages ??
    root.entries ??
    root.history ??
    root.lines ??
    (Array.isArray(data) ? data : null);
  if (!Array.isArray(raw)) return [];

  const out: Array<{ role: "user" | "assistant"; text: string; idempotencyKey?: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const roleRaw =
      (typeof o.role === "string" ? o.role : null) ??
      (typeof o.kind === "string" ? o.kind : null) ??
      (typeof o.type === "string" ? o.type : null);
    const role =
      roleRaw === "assistant" || roleRaw === "model" || roleRaw === "agent"
        ? "assistant"
        : roleRaw === "user" || roleRaw === "human"
          ? "user"
          : null;
    if (!role) continue;
    const text = extractAssistantText(o.message ?? o.text ?? o.content ?? o);
    if (!text.trim()) continue;

    // Best-effort: upstream history may include an idempotency key, client message id,
    // or other stable message identifier. We only use it for optimistic dedupe.
    const idempotencyKey =
      (typeof o.idempotencyKey === "string" && o.idempotencyKey.trim() !== ""
        ? o.idempotencyKey.trim()
        : undefined) ??
      (typeof o.idempotency_key === "string" && o.idempotency_key.trim() !== ""
        ? o.idempotency_key.trim()
        : undefined) ??
      (typeof o.idempotency === "string" && o.idempotency.trim() !== "" ? o.idempotency.trim() : undefined);

    out.push({ role, text, idempotencyKey });
  }
  return out;
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
  private historyLoaded = false;

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
    this.historyLoaded = false;
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

    if (!this.historyLoaded) {
      this.historyLoaded = true;
      try {
        const hist = await this.client.request(
          "chat.history",
          { sessionKey: this.sessionKey, limit: 200 },
          undefined,
          20_000,
        );
        const entries = normalizeHistoryPayload(hist);
        if (entries.length) this.emit({ type: "history", entries });
      } catch {
        // History optional
      }
    }
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
