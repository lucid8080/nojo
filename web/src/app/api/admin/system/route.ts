import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/db";
import { checkHealth, loadOpenClawConfig, OpenClawError } from "@/lib/openclaw/client";
import type { AdminSystemSnapshot } from "@/types/admin";

export const runtime = "nodejs";

function envPresent(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.trim() !== "";
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    let database: AdminSystemSnapshot["database"] = { ok: false };
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = { ok: true };
    } catch (e) {
      database = {
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      };
    }

    let openClaw: AdminSystemSnapshot["openClaw"] = {
      baseUrlConfigured: envPresent("OPENCLAW_BASE_URL"),
      gatewayTokenPresent: false,
      hooksTokenPresent: false,
      timeoutMs: null,
      loadError: null,
    };

    try {
      const cfg = loadOpenClawConfig();
      openClaw = {
        baseUrlConfigured: true,
        gatewayTokenPresent: Boolean(cfg.gatewayToken),
        hooksTokenPresent: Boolean(cfg.hooksToken),
        timeoutMs: cfg.timeoutMs,
        loadError: null,
      };
    } catch (e) {
      openClaw = {
        ...openClaw,
        loadError: e instanceof Error ? e.message : String(e),
      };
    }

    let openClawHealth: AdminSystemSnapshot["openClawHealth"] = {
      ok: false,
      message: "Not checked",
    };
    try {
      const h = await checkHealth();
      openClawHealth = {
        ok: h.status >= 200 && h.status < 300,
        status: h.status,
        endpoint: h.endpoint,
      };
    } catch (err) {
      if (err instanceof OpenClawError) {
        openClawHealth = {
          ok: false,
          message: err.message,
          code: err.code,
        };
      } else {
        openClawHealth = {
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        };
      }
    }

    const recommendations: string[] = [];
    if (!openClaw.baseUrlConfigured) {
      recommendations.push("Set OPENCLAW_BASE_URL for OpenClaw connectivity.");
    }
    if (openClaw.loadError) {
      recommendations.push("Fix OpenClaw configuration errors (see load error).");
    }
    if (!openClaw.gatewayTokenPresent && openClaw.baseUrlConfigured) {
      recommendations.push(
        "Gateway token missing: set OPENCLAW_GATEWAY_TOKEN or OPENCLAW_API_TOKEN for authenticated gateway calls.",
      );
    }
    if (!envPresent("NEXTAUTH_SECRET")) {
      recommendations.push("Set NEXTAUTH_SECRET for production session signing.");
    }

    const snapshot: AdminSystemSnapshot = {
      database,
      nextAuth: { secretConfigured: envPresent("NEXTAUTH_SECRET") },
      openClaw,
      openClawHealth,
      environment: {
        nodeEnv: process.env.NODE_ENV,
      },
      recommendations,
    };

    return NextResponse.json({
      success: true,
      data: snapshot,
      warnings: [] as string[],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
