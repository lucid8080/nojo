/** Aligns with `RecentRunsList` terminal detection for admin stats. */
const TERMINAL_LOWER = new Set([
  "completed",
  "succeeded",
  "failed",
  "cancelled",
  "canceled",
  "error",
]);

export function isTerminalRunStatus(status: string): boolean {
  return TERMINAL_LOWER.has(status.toLowerCase().trim());
}

export function isFailedRunStatus(status: string): boolean {
  const s = status.toLowerCase().trim();
  return s === "failed" || s === "error";
}
