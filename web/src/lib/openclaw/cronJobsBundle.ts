import { OpenClawError } from "@/lib/openclaw/client";
import { callOpenClawCronList } from "@/lib/openclaw/openClawCronGateway";
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
    const gw = await callOpenClawCronList();
    const jobsRaw = extractCronJobsArrayFromUnknown(gw.raw);
    const jobs = normalizeOpenClawCronJobList(jobsRaw, { year, monthIndex });
    const withOcc = jobs.filter((j) => j.occurrencesInMonth.length > 0).length;
    // #region agent log
    {
      const d = gw.raw;
      const keys =
        d != null && typeof d === "object" && !Array.isArray(d)
          ? Object.keys(d as object).slice(0, 24)
          : [];
      let preview = "";
      try {
        preview = JSON.stringify(d).slice(0, 1800);
      } catch {
        preview = "(stringify failed)";
      }
      fetch("http://127.0.0.1:7818/ingest/7c1439b6-86e7-496a-b71e-0c1383a70c7d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b4897e" },
        body: JSON.stringify({
          sessionId: "b4897e",
          location: "cronJobsBundle.ts:gatewayOk",
          message: "cron bundle from gateway",
          hypothesisId: "H2",
          data: {
            year,
            monthIndex,
            rawExtractedCount: jobsRaw.length,
            normalizedCount: jobs.length,
            jobsWithOccurrencesInMonth: withOcc,
            gatewayDataType: d === null ? "null" : Array.isArray(d) ? "array" : typeof d,
            gatewayTopKeys: keys,
            gatewayJsonPreview: jobsRaw.length === 0 ? preview : "",
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion

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
    // #region agent log
    fetch("http://127.0.0.1:7818/ingest/7c1439b6-86e7-496a-b71e-0c1383a70c7d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b4897e" },
      body: JSON.stringify({
        sessionId: "b4897e",
        location: "cronJobsBundle.ts:gatewayErr",
        message: "gateway cron list failed",
        hypothesisId: "H4",
        data: {
          year,
          monthIndex,
          detail: detail.slice(0, 200),
          diskFallbackDisabled: isDiskFallbackDisabled(),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (isDiskFallbackDisabled()) {
      return sanitizeJsonForClient({
        success: false,
        message: `OpenClaw gateway RPC cron.list unavailable: ${detail}`,
        cronDataSource: "openclaw_gateway" as const,
        sourceDetail: "",
        sourcePath: "",
        jobs: [],
        warnings,
        year,
        monthIndex,
      });
    }

    warnings.push(
      `OpenClaw gateway RPC cron.list failed; using local disk mirror fallback only (degraded mode). (${detail})`,
    );

    const disk = await readOpenClawCronJobsFromDisk();
    if (!disk.ok) {
      return sanitizeJsonForClient({
        success: false,
        message:
          disk.error ??
          `OpenClaw gateway RPC cron.list failed (${detail}) and fallback disk cron mirror could not be read.`,
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
    const withOccDisk = jobs.filter((j) => j.occurrencesInMonth.length > 0).length;
    // #region agent log
    fetch("http://127.0.0.1:7818/ingest/7c1439b6-86e7-496a-b71e-0c1383a70c7d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b4897e" },
      body: JSON.stringify({
        sessionId: "b4897e",
        location: "cronJobsBundle.ts:diskFallback",
        message: "cron bundle from disk mirror",
        hypothesisId: "H4",
        data: {
          year,
          monthIndex,
          rawExtractedCount: disk.jobsRaw.length,
          normalizedCount: jobs.length,
          jobsWithOccurrencesInMonth: withOccDisk,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

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
