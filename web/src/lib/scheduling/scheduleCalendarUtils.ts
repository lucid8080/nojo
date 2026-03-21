import type { OperationalScheduledJob } from "@/lib/openclaw/openClawCronTypes";

/** YYYY-MM-DD in local calendar for a Date */
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Group normalized jobs by calendar day using `occurrencesInMonth` (local keys). */
export function groupOperationalJobsByDayKey(
  jobs: OperationalScheduledJob[],
): Map<string, OperationalScheduledJob[]> {
  const map = new Map<string, OperationalScheduledJob[]>();
  for (const job of jobs) {
    for (const iso of job.occurrencesInMonth) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) continue;
      const key = localDayKey(d);
      const list = map.get(key);
      if (list) {
        if (!list.some((j) => j.id === job.id)) list.push(job);
      } else {
        map.set(key, [job]);
      }
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      const ta = a.nextRunAt ? new Date(a.nextRunAt).getTime() : 0;
      const tb = b.nextRunAt ? new Date(b.nextRunAt).getTime() : 0;
      return ta - tb;
    });
  }
  return map;
}
