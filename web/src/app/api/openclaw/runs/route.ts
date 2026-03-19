import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth-server";
import { OpenClawError, createRun, type CreateRunPayload } from "@/lib/openclaw/client";

export const runtime = "nodejs";

type SubmitRunBody = {
  prompt?: unknown;
  agentId?: unknown;
  conversationId?: unknown;
  metadata?: unknown;
};

function normalizeErrorMessage(message: unknown) {
  if (typeof message === "string") return message;
  return "OpenClaw request failed.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validateBody(body: SubmitRunBody): { ok: true; payload: CreateRunPayload } | { ok: false; message: string } {
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return { ok: false, message: "Missing required field: prompt." };
  if (prompt.length > 20000) return { ok: false, message: "prompt is too long." };

  const agentId = typeof body.agentId === "string" ? body.agentId.trim() : undefined;
  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId.trim() : undefined;

  const metadata =
    isRecord(body.metadata) ? (body.metadata as Record<string, unknown>) : undefined;

  return {
    ok: true,
    payload: {
      prompt,
      agentId: agentId || undefined,
      conversationId: conversationId || undefined,
      metadata,
    },
  };
}

function sanitizeRawForResponse(raw: unknown) {
  // We already sanitize tokens in the client. If something unexpected slips through, strip common sensitive keys.
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const forbidden = new Set(["token", "access_token", "api_token", "authorization", "secret", "password", "key"]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (forbidden.has(k.toLowerCase())) continue;
    out[k] = v;
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to submit runs." },
        { status: 401 },
      );
    }

    const body = (await req.json()) as SubmitRunBody;
    const validation = validateBody(body);

    if (!validation.ok) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 },
      );
    }

    const result = await createRun(validation.payload);

    if (!result.success || !result.upstreamAccepted) {
      return NextResponse.json(
        {
          success: false,
          message: result.message ?? "OpenClaw did not accept the run.",
          status: result.status,
          upstreamAccepted: result.upstreamAccepted,
        },
        { status: 502 },
      );
    }

    const status = result.status ?? "submitted";
    const run = await prisma.run.create({
      data: {
        userId,
        openclawRunId: result.runId ?? null,
        prompt: validation.payload.prompt,
        agentId: validation.payload.agentId ?? null,
        conversationId: validation.payload.conversationId ?? null,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      status,
      message: result.message ?? "Run submitted.",
      upstreamAccepted: result.upstreamAccepted,
      id: run.id,
      runId: result.runId ?? undefined,
      raw: sanitizeRawForResponse(result.raw),
    });
  } catch (err) {
    if (err instanceof OpenClawError && err.code === "CONFIG") {
      return NextResponse.json(
        {
          success: false,
          message: err.message,
          code: err.code,
        },
        { status: 500 },
      );
    }

    if (err instanceof OpenClawError) {
      const status =
        typeof err.status === "number" ? err.status : undefined;
      const httpStatus = err.code === "TIMEOUT" ? 504 : 502;
      return NextResponse.json(
        {
          success: false,
          message: normalizeErrorMessage(err.message),
          code: err.code,
          upstreamStatus: status,
        },
        { status: httpStatus },
      );
    }

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}

const RECENT_RUNS_LIMIT = 30;

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to view runs." },
        { status: 401 },
      );
    }

    const runs = await prisma.run.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: RECENT_RUNS_LIMIT,
    });
    return NextResponse.json({
      success: true,
      runs: runs.map((r) => ({
        id: r.id,
        openclawRunId: r.openclawRunId,
        prompt: r.prompt,
        agentId: r.agentId,
        conversationId: r.conversationId,
        status: r.status,
        errorMessage: r.errorMessage,
        lastCheckedAt: r.lastCheckedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}

