import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { checkHealth, OpenClawError } from "@/lib/openclaw/client";
import { getCronJobsBundle } from "@/lib/openclaw/cronJobsBundle";
import { isFailedRunStatus, isTerminalRunStatus } from "@/lib/admin/runStatus";
import type { AdminOverviewStats } from "@/types/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const [
      totalUsers,
      totalAgents,
      totalConversations,
      totalRuns,
      runStatusRows,
      recentUsers,
      recentRuns,
      recentConversations,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userWorkspaceAgent.count(),
      prisma.workspaceConversation.count(),
      prisma.run.count(),
      prisma.run.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.run.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          user: { select: { id: true, email: true } },
        },
      }),
      prisma.workspaceConversation.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          user: { select: { id: true, email: true } },
        },
      }),
    ]);

    let runsInProgress = 0;
    let runsFailed = 0;
    for (const row of runStatusRows) {
      const n = row._count._all;
      if (isFailedRunStatus(row.status)) runsFailed += n;
      if (!isTerminalRunStatus(row.status)) runsInProgress += n;
    }

    let openClawHealth: AdminOverviewStats["openClawHealth"] = {
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

    const now = new Date();
    const cronBundleRaw = await getCronJobsBundle(now.getFullYear(), now.getMonth());
    const cronBundle = cronBundleRaw as {
      success?: boolean;
      jobs?: unknown[];
      message?: string;
    };
    const cronJobsCount =
      cronBundle.success && Array.isArray(cronBundle.jobs) ? cronBundle.jobs.length : null;

    const stats: AdminOverviewStats = {
      totalUsers,
      totalAgents,
      totalConversations,
      totalRuns,
      runsInProgress,
      runsFailed,
      openClawHealth,
      cronJobsCount,
      cronJobsAvailable: cronBundle.success === true,
    };

    const alerts: string[] = [];
    if (!openClawHealth.ok) {
      alerts.push(openClawHealth.message ?? "OpenClaw health check failed.");
    }
    if (cronBundle.success === false && "message" in cronBundle && cronBundle.message) {
      alerts.push(String(cronBundle.message));
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentUsers: recentUsers.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        })),
        recentRuns: recentRuns.map((r) => ({
          id: r.id,
          openclawRunId: r.openclawRunId,
          status: r.status,
          promptPreview: r.prompt.length > 160 ? `${r.prompt.slice(0, 160)}…` : r.prompt,
          createdAt: r.createdAt.toISOString(),
          user: r.user,
        })),
        recentConversations: recentConversations.map((c) => ({
          id: c.id,
          title: c.title,
          createdAt: c.createdAt.toISOString(),
          user: c.user,
        })),
        alerts,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
