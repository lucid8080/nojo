import { describe, expect, it } from "vitest";

import { normalizeHistoryPayload } from "./openclaw-chat-bridge";

describe("normalizeHistoryPayload user bubble (Nojo composed prompt)", () => {
  it("strips injected context; keeps only User request body for user role", () => {
    const composedUser = [
      "NOJO_USER_WORKSPACE_AGENT: instructions…",
      "",
      "User request:",
      "how are you",
    ].join("\n");

    expect(
      normalizeHistoryPayload({
        messages: [{ role: "user", text: composedUser }],
      }),
    ).toEqual([{ role: "user", text: "how are you", idempotencyKey: undefined }]);
  });
});

describe("normalizeHistoryPayload", () => {
  it("parses flat messages with role and text", () => {
    expect(
      normalizeHistoryPayload({
        messages: [
          { role: "user", text: "Hi" },
          { role: "assistant", text: "Hello" },
        ],
      }),
    ).toEqual([
      { role: "user", text: "Hi", idempotencyKey: undefined },
      { role: "assistant", text: "Hello", idempotencyKey: undefined },
    ]);
  });

  it("supports entries and lines keys (legacy)", () => {
    expect(
      normalizeHistoryPayload({
        entries: [{ role: "user", content: "A" }],
      }),
    ).toEqual([{ role: "user", text: "A", idempotencyKey: undefined }]);

    expect(
      normalizeHistoryPayload({
        lines: [{ role: "assistant", text: "B" }],
      }),
    ).toEqual([{ role: "assistant", text: "B", idempotencyKey: undefined }]);
  });

  it("unwraps data / payload / result envelopes", () => {
    expect(
      normalizeHistoryPayload({
        data: {
          messages: [{ role: "user", text: "x" }],
        },
      }),
    ).toEqual([{ role: "user", text: "x", idempotencyKey: undefined }]);

    expect(
      normalizeHistoryPayload({
        payload: {
          items: [{ role: "assistant", text: "y" }],
        },
      }),
    ).toEqual([{ role: "assistant", text: "y", idempotencyKey: undefined }]);
  });

  it("reads items, events, transcript, and turns arrays", () => {
    expect(
      normalizeHistoryPayload({
        items: [{ role: "user", text: "i" }],
      }),
    ).toEqual([{ role: "user", text: "i", idempotencyKey: undefined }]);

    expect(
      normalizeHistoryPayload({
        events: [{ role: "assistant", text: "e" }],
      }),
    ).toEqual([{ role: "assistant", text: "e", idempotencyKey: undefined }]);

    expect(
      normalizeHistoryPayload({
        transcript: [{ role: "user", text: "t" }],
      }),
    ).toEqual([{ role: "user", text: "t", idempotencyKey: undefined }]);

    expect(
      normalizeHistoryPayload({
        turns: [{ role: "assistant", text: "u" }],
      }),
    ).toEqual([{ role: "assistant", text: "u", idempotencyKey: undefined }]);
  });

  it("reads role and text from nested message object", () => {
    expect(
      normalizeHistoryPayload({
        messages: [
          {
            message: { role: "user", content: "Nested user" },
          },
          {
            message: { role: "assistant", content: "Nested reply" },
          },
        ],
      }),
    ).toEqual([
      { role: "user", text: "Nested user", idempotencyKey: undefined },
      { role: "assistant", text: "Nested reply", idempotencyKey: undefined },
    ]);
  });

  it("extracts text from nested message.content arrays (parts)", () => {
    expect(
      normalizeHistoryPayload({
        messages: [
          {
            message: {
              role: "assistant",
              content: [{ text: "Part " }, { text: "two" }],
            },
          },
        ],
      }),
    ).toEqual([{ role: "assistant", text: "Part two", idempotencyKey: undefined }]);
  });

  it("maps model and agent roles to assistant", () => {
    expect(
      normalizeHistoryPayload({
        messages: [
          { role: "model", text: "m" },
          { role: "agent", text: "a" },
        ],
      }),
    ).toEqual([
      { role: "assistant", text: "m", idempotencyKey: undefined },
      { role: "assistant", text: "a", idempotencyKey: undefined },
    ]);
  });

  it("reads text from top-level parts when message is an empty object (OpenClaw shape)", () => {
    expect(
      normalizeHistoryPayload({
        messages: [
          {
            role: "user",
            message: {},
            parts: [{ text: "Hello from parts" }],
          },
        ],
      }),
    ).toEqual([{ role: "user", text: "Hello from parts", idempotencyKey: undefined }]);
  });

  it("reads thinking string on history rows", () => {
    expect(
      normalizeHistoryPayload({
        messages: [{ role: "assistant", thinking: "Planning step…" }],
      }),
    ).toEqual([{ role: "assistant", text: "Planning step…", idempotencyKey: undefined }]);
  });

  it("maps tool, system, and function roles to assistant (OpenClaw / OpenAI transcripts)", () => {
    expect(
      normalizeHistoryPayload({
        messages: [
          { role: "tool", content: "tool output" },
          { role: "system", text: "instructions" },
          { role: "function", text: "fn" },
        ],
      }),
    ).toEqual([
      { role: "assistant", text: "tool output", idempotencyKey: undefined },
      { role: "assistant", text: "instructions", idempotencyKey: undefined },
      { role: "assistant", text: "fn", idempotencyKey: undefined },
    ]);
  });

  it("is case-insensitive for role strings", () => {
    expect(
      normalizeHistoryPayload({
        messages: [{ role: "User", text: "u" }],
      }),
    ).toEqual([{ role: "user", text: "u", idempotencyKey: undefined }]);
  });

  it("preserves idempotency keys on outer and nested message", () => {
    expect(
      normalizeHistoryPayload({
        messages: [
          { role: "user", text: "x", idempotencyKey: " k1 " },
          { message: { role: "user", text: "y", idempotency_key: "k2" } },
        ],
      }),
    ).toEqual([
      { role: "user", text: "x", idempotencyKey: "k1" },
      { role: "user", text: "y", idempotencyKey: "k2" },
    ]);
  });

  it("accepts a top-level array", () => {
    expect(
      normalizeHistoryPayload([{ role: "user", text: "plain array" }]),
    ).toEqual([{ role: "user", text: "plain array", idempotencyKey: undefined }]);
  });

  it("returns empty for unsupported shapes", () => {
    expect(normalizeHistoryPayload(null)).toEqual([]);
    expect(normalizeHistoryPayload(undefined)).toEqual([]);
    expect(normalizeHistoryPayload({})).toEqual([]);
    expect(normalizeHistoryPayload({ foo: [{ role: "user", text: "x" }] })).toEqual([]);
  });
});
