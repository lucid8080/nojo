import { listOpenClawCronJobsFromGateway, OpenClawError } from "@/lib/openclaw/client";
import {
  extractCronJobsArrayFromUnknown,
  normalizeOpenClawCronJobList,
} from "@/lib/openclaw/normalizeOpenClawCronJobs";
import {
  readOpenClawCronJobsFromDisk,
  sanitizeJsonForClient,
} from "@/lib/openclaw/readOpenClawCronJobs";

export function parseYearMonthFromSearchParams(searchParams: URLSearchParams): {
  year: number;
  monthIndex: number;
} {
  const now = new Date();
  let year = now.getFullYear();
  let monthIndex = now.getMonth();
  const ys = searchParams.get("year");
  const ms = searchParams.get("month");
  if (ys != null && ys !== "") {
    const n = Number(ys);
    if (Number.isFinite(n)) year = Math.floor(n);
  }
  if (ms != null && ms !== "") {
    const n = Number(ms);
    if (Number.isFinite(n)) monthIndex = Math.min(11, Math.max(0, Math.floor(n)));
  }
  return { year, monthIndex };
}

function isDiskFallbackDisabled(): boolean {
  const v = process.env.NOJO_CRON_ALLOW_DISK_FALLBACK?.trim().toLowerCase() ?? "";
  return v === "0" || v === "false" || v === "no";
}

function formatGatewayError(err: unknown): string {
  if (err instanceof OpenClawError) {
    const extra = err.status != null ? ` (HTTP ${err.status})` : "";
    return `${err.message}${extra}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Shared OpenClaw cron listing (gateway with optional disk mirror). Used by
 * `/api/openclaw/cron-jobs` and `/api/admin/schedules`.
 */
export async function getCronJobsBundle(year: number, monthIndex: number) {
  const warnings: string[] = [];

  try {
    const gw = await listOpenClawCronJobsFromGateway();
    const jobsRaw = extractCronJobsArrayFromUnknown(gw.data);
    const jobs = normalizeOpenClawCronJobList(jobsRaw, { year, monthIndex });

    return sanitizeJsonForClient({
      success: true,
      cronDataSource: "openclaw_gateway" as const,
      sourceDetail: gw.sourceDetail,
      sourcePath: gw.sourceDetail,
      jobs,
      warnings,
      year,
      monthIndex,
    });
  } catch (gatewayErr) {
    const detail = formatGatewayError(gatewayErr);

    if (isDiskFallbackDisabled()) {
      return sanitizeJsonForClient({
        success: false,
        message: `OpenClaw gateway cron unavailable: ${detail}`,
        cronDataSource: "openclaw_gateway" as const,
        sourceDetail: "",
        sourcePath: "",
        jobs: [],
        warnings,
        year,
        monthIndex,
      });
    }

    warnings.push(`OpenClaw gateway unreachable; using local disk mirror. (${detail})`);

    const disk = await readOpenClawCronJobsFromDisk();
    if (!disk.ok) {
      return sanitizeJsonForClient({
        success: false,
        message:
          disk.error ??
          `OpenClaw gateway failed (${detail}) and no local cron mirror file could be read.`,
        cronDataSource: "disk_mirror" as const,
        sourceDetail: disk.resolvedPath,
        sourcePath: disk.resolvedPath,
        jobs: [],
        warnings: [...warnings, ...disk.warnings],
        year,
        monthIndex,
      });
    }

    warnings.push(...disk.warnings);
    const jobs = normalizeOpenClawCronJobList(disk.jobsRaw, { year, monthIndex });

    return sanitizeJsonForClient({
      success: true,
      cronDataSource: "disk_mirror" as const,
      sourceDetail: disk.resolvedPath,
      sourcePath: disk.resolvedPath,
      jobs,
      warnings,
      year,
      monthIndex,
    });
  }
}
