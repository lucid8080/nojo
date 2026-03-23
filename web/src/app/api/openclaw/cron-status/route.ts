import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { listOpenClawCronJobsFromGateway, OpenClawError, loadOpenClawConfig } from "@/lib/openclaw/client";
import { extractCronJobsArrayFromUnknown } from "@/lib/openclaw/normalizeOpenClawCronJobs";
import { readOpenClawCronJobsFromDisk } from "@/lib/openclaw/readOpenClawCronJobs";

export const runtime = "nodejs";

function isDiskFallbackDisabled(): boolean {
  const v = process.env.NOJO_CRON_ALLOW_DISK_FALLBACK?.trim().toLowerCase() ?? "";
  return v === "0" || v === "false" || v === "no";
}

function safeGatewayBaseUrl(): string | null {
  try {
    return loadOpenClawConfig().baseUrl;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest) {
  try {
    const userId = await getSessionUserId(_req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to view cron status." },
        { status: 401 },
      );
    }

    const gatewayBase = safeGatewayBaseUrl();
    const diskFallbackAllowed = !isDiskFallbackDisabled();

    const diskSnapshot = async () => {
      const disk = await readOpenClawCronJobsFromDisk();
      return disk.ok
        ? {
            readable: true as const,
            path: disk.resolvedPath,
            extractedJobCount: disk.jobsRaw.length,
          }
        : {
            readable: false as const,
            path: disk.resolvedPath,
            error: disk.error ?? "Unknown error",
          };
    };

    if (!gatewayBase) {
      const diskMirror = await diskSnapshot();
      return NextResponse.json({
        success: true,
        openclawBaseUrlConfigured: false,
        diskFallbackAllowed,
        gateway: {
          reachable: false,
          reason: "OPENCLAW_BASE_URL is not set.",
        },
        diskMirror,
      });
    }

    try {
      const gw = await listOpenClawCronJobsFromGateway();
      const jobsRaw = extractCronJobsArrayFromUnknown(gw.data);
      const responseTopLevelKeys =
        gw.data != null && typeof gw.data === "object" && !Array.isArray(gw.data)
          ? Object.keys(gw.data as object).slice(0, 16)
          : [];

      return NextResponse.json({
        success: true,
        openclawBaseUrlConfigured: true,
        diskFallbackAllowed,
        gateway: {
          reachable: true,
          endpoint: gw.endpoint,
          sourceDetail: gw.sourceDetail,
          extractedJobCount: jobsRaw.length,
          responseTopLevelKeys,
        },
      });
    } catch (gatewayErr) {
      const message =
        gatewayErr instanceof OpenClawError
          ? gatewayErr.message
          : gatewayErr instanceof Error
            ? gatewayErr.message
            : String(gatewayErr);
      const code = gatewayErr instanceof OpenClawError ? gatewayErr.code : undefined;
      const status = gatewayErr instanceof OpenClawError ? gatewayErr.status : undefined;

      const diskMirror = await diskSnapshot();

      return NextResponse.json({
        success: true,
        openclawBaseUrlConfigured: true,
        diskFallbackAllowed,
        gateway: {
          reachable: false,
          message,
          code,
          status,
        },
        diskMirror,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
