/**
 * MOCK — Replace with GET /schedules or tasks?scheduled=1
 * Tasks repeat each calendar month (same day-of-month) for predictable demos.
 */

export type ScheduledAgentTaskState = "queued" | "running";

export type ScheduledAgentTask = {
  id: string;
  jobId: string;
  jobTitle: string;
  taskTitle: string;
  agentName: string;
  /** ISO 8601 */
  scheduledAt: string;
  state?: ScheduledAgentTaskState;
};

/** Day-of-month (1–28), hour, minute — stable across months */
type TaskTemplate = Omit<ScheduledAgentTask, "scheduledAt"> & {
  dayOfMonth: number;
  hour: number;
  minute: number;
};

const TEMPLATES: TaskTemplate[] = [
  {
    id: "sch-1",
    jobId: "j1",
    jobTitle: "WordPress Malware Cleanup",
    taskTitle: "Final validation & handoff",
    agentName: "QA Agent",
    dayOfMonth: 3,
    hour: 9,
    minute: 0,
    state: "queued",
  },
  {
    id: "sch-2",
    jobId: "j2",
    jobTitle: "Competitor Research Sprint",
    taskTitle: "Charts & appendix queue",
    agentName: "Analyst Agent",
    dayOfMonth: 3,
    hour: 14,
    minute: 30,
    state: "running",
  },
  {
    id: "sch-3",
    jobId: "j3",
    jobTitle: "Outbound CRM Enrichment",
    taskTitle: "Webhook dry-run",
    agentName: "CRM Agent",
    dayOfMonth: 5,
    hour: 10,
    minute: 15,
    state: "queued",
  },
  {
    id: "sch-4",
    jobId: "j4",
    jobTitle: "Landing Page Builder",
    taskTitle: "Accessibility sweep",
    agentName: "QA Agent",
    dayOfMonth: 5,
    hour: 16,
    minute: 0,
    state: "queued",
  },
  {
    id: "sch-5",
    jobId: "j5",
    jobTitle: "SEO Content Cluster",
    taskTitle: "Publish schedule review",
    agentName: "Research Agent",
    dayOfMonth: 7,
    hour: 11,
    minute: 0,
  },
  {
    id: "sch-6",
    jobId: "j6",
    jobTitle: "Legal Intake Automation",
    taskTitle: "Citation check",
    agentName: "Analyst Agent",
    dayOfMonth: 7,
    hour: 15,
    minute: 45,
    state: "queued",
  },
  {
    id: "sch-7",
    jobId: "j8",
    jobTitle: "Cold Outreach Sequence",
    taskTitle: "Send-time optimization",
    agentName: "Outreach Agent",
    dayOfMonth: 10,
    hour: 8,
    minute: 30,
  },
  {
    id: "sch-8",
    jobId: "j1",
    jobTitle: "WordPress Malware Cleanup",
    taskTitle: "Client sync call",
    agentName: "Report Agent",
    dayOfMonth: 10,
    hour: 13,
    minute: 0,
    state: "running",
  },
  {
    id: "sch-9",
    jobId: "j3",
    jobTitle: "Outbound CRM Enrichment",
    taskTitle: "Field validation batch",
    agentName: "CRM Agent",
    dayOfMonth: 12,
    hour: 9,
    minute: 45,
  },
  {
    id: "sch-10",
    jobId: "j4",
    jobTitle: "Landing Page Builder",
    taskTitle: "Form analytics wiring",
    agentName: "Builder Agent",
    dayOfMonth: 12,
    hour: 14,
    minute: 0,
    state: "queued",
  },
  {
    id: "sch-11",
    jobId: "j7",
    jobTitle: "Sandbox CRM Migration",
    taskTitle: "Error path tests",
    agentName: "QA Agent",
    dayOfMonth: 14,
    hour: 10,
    minute: 30,
  },
  {
    id: "sch-12",
    jobId: "j2",
    jobTitle: "Competitor Research Sprint",
    taskTitle: "Executive summary draft",
    agentName: "Report Agent",
    dayOfMonth: 14,
    hour: 17,
    minute: 0,
    state: "queued",
  },
  {
    id: "sch-13",
    jobId: "j5",
    jobTitle: "SEO Content Cluster",
    taskTitle: "Schema markup batch",
    agentName: "SEO Agent",
    dayOfMonth: 18,
    hour: 9,
    minute: 0,
    state: "running",
  },
  {
    id: "sch-14",
    jobId: "j8",
    jobTitle: "Cold Outreach Sequence",
    taskTitle: "Launch checklist",
    agentName: "Outreach Agent",
    dayOfMonth: 18,
    hour: 11,
    minute: 30,
  },
  {
    id: "sch-15",
    jobId: "j6",
    jobTitle: "Legal Intake Automation",
    taskTitle: "Partner review packet",
    agentName: "Report Agent",
    dayOfMonth: 20,
    hour: 15,
    minute: 0,
  },
  {
    id: "sch-16",
    jobId: "j1",
    jobTitle: "WordPress Malware Cleanup",
    taskTitle: "Security re-scan",
    agentName: "Security Agent",
    dayOfMonth: 22,
    hour: 8,
    minute: 0,
    state: "queued",
  },
  {
    id: "sch-17",
    jobId: "j3",
    jobTitle: "Outbound CRM Enrichment",
    taskTitle: "Enrichment workflow prep",
    agentName: "Automation Agent",
    dayOfMonth: 22,
    hour: 12,
    minute: 15,
  },
  {
    id: "sch-18",
    jobId: "j5",
    jobTitle: "SEO Content Cluster",
    taskTitle: "Keyword gap analysis",
    agentName: "SEO Agent",
    dayOfMonth: 24,
    hour: 10,
    minute: 0,
  },
  {
    id: "sch-19",
    jobId: "j7",
    jobTitle: "Sandbox CRM Migration",
    taskTitle: "Stage mapping draft",
    agentName: "CRM Agent",
    dayOfMonth: 24,
    hour: 14,
    minute: 30,
    state: "queued",
  },
  {
    id: "sch-20",
    jobId: "j2",
    jobTitle: "Competitor Research Sprint",
    taskTitle: "Data refresh job",
    agentName: "Analyst Agent",
    dayOfMonth: 26,
    hour: 9,
    minute: 30,
  },
  {
    id: "sch-21",
    jobId: "j8",
    jobTitle: "Cold Outreach Sequence",
    taskTitle: "Reply sentiment classifier",
    agentName: "Research Agent",
    dayOfMonth: 26,
    hour: 16,
    minute: 0,
    state: "running",
  },
  {
    id: "sch-22",
    jobId: "j4",
    jobTitle: "Landing Page Builder",
    taskTitle: "Hero A/B deploy",
    agentName: "Builder Agent",
    dayOfMonth: 28,
    hour: 11,
    minute: 0,
  },
];

function clampDay(year: number, monthIndex: number, day: number): number {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(1, day), last);
}

/** All scheduled tasks for a given calendar month (local timezone). */
export function getScheduledTasksForMonth(
  year: number,
  monthIndex: number,
): ScheduledAgentTask[] {
  return TEMPLATES.map((t) => {
    const day = clampDay(year, monthIndex, t.dayOfMonth);
    const d = new Date(year, monthIndex, day, t.hour, t.minute, 0, 0);
    const { dayOfMonth, hour, minute, ...rest } = t;
    return {
      ...rest,
      scheduledAt: d.toISOString(),
    };
  });
}

/** YYYY-MM-DD in local calendar for a Date */
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function groupTasksByDayKey(
  tasks: ScheduledAgentTask[],
): Map<string, ScheduledAgentTask[]> {
  const map = new Map<string, ScheduledAgentTask[]>();
  for (const t of tasks) {
    const key = localDayKey(new Date(t.scheduledAt));
    const list = map.get(key);
    if (list) {
      list.push(t);
    } else {
      map.set(key, [t]);
    }
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  }
  return map;
}
