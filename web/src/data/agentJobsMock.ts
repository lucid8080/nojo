/**
 * DTOs for dashboard job cards (`Job`, `TaskLogEntry`, `JobStatus`).
 * The work board hydrates these from Agent Workspace seed data via `workspaceBoardProjection`
 * (not from `JOB_SEEDS` / `BOARD_JOB_IDS` in production UI).
 */

export type TaskLogState = "done" | "running" | "queued" | "blocked";

export type JobStatus =
  | "Queued"
  | "Running"
  | "In Progress"
  | "Analyzing"
  | "Reviewing"
  | "Completed"
  | "Blocked";

export type JobPriority = "Low" | "Medium" | "High";

export type TaskLogActorKind = "agent" | "system" | "run";

export type TaskLogEntry = {
  id: string;
  text: string;
  /** Display name in the task log row */
  agentName: string;
  state: TaskLogState;
  meta?: string;
  time?: string;
  highlight?: "running" | "milestone" | "blocked";
  /** Avatar/rendering mode; omit for legacy mock rows (treated as agent by display name). */
  actorKind?: TaskLogActorKind;
  /** Canonical roster id when actorKind is "agent". */
  participantId?: string;
};

export type JobFooter = {
  eta: string;
  tokensTools: string;
  phase: string;
  completionPct: number;
};

export type Job = {
  id: string;
  title: string;
  client: string;
  status: JobStatus;
  priority: JobPriority;
  /** Display names (resolved from roster when from workspace projection). */
  agents: string[];
  /** Same order as agents; used for avatar keys. Empty for legacy mock jobs. */
  agentIds: string[];
  /** OpenClaw / UI routing lead; optional on legacy mock jobs. */
  primaryAgentId?: string;
  /** Resolved display name for lead agent (workspace projection). */
  primaryAgentName?: string;
  startedAgo?: string;
  tasks: TaskLogEntry[];
  footer: JobFooter;
};

function entry(
  id: string,
  text: string,
  agentName: string,
  state: TaskLogState,
  opts?: Partial<Pick<TaskLogEntry, "meta" | "time" | "highlight" | "actorKind" | "participantId">>,
): TaskLogEntry {
  return { id, text, agentName, state, ...opts };
}

/** Canonical seeds by id — used to reset jobs when they re-enter the conveyor */
export const JOB_SEEDS: Record<string, Job> = {
  j1: {
    id: "j1",
    title: "WordPress Malware Cleanup",
    client: "North Ridge Capital",
    status: "In Progress",
    priority: "High",
    agents: ["Security Agent", "File Audit Agent", "Report Agent"],
    agentIds: [],
    startedAgo: "18 min ago",
    tasks: [
      entry("j1-t1", "Scanned public_html for suspicious PHP files", "Security Agent", "done", {
        meta: "12 files changed",
        time: "14m ago",
      }),
      entry("j1-t2", "Flagged 184 modified files", "File Audit Agent", "done", {
        meta: "3 sources checked",
        time: "11m ago",
      }),
      entry("j1-t3", "Isolated casino spam pages", "Security Agent", "done", { time: "9m ago" }),
      entry("j1-t4", "Removed malicious cron entries", "Security Agent", "done", { time: "7m ago" }),
      entry("j1-t5", "Verified wp-config integrity", "File Audit Agent", "done", { time: "5m ago" }),
      entry("j1-t6", "Regenerated salts", "Security Agent", "done", {
        meta: "Milestone",
        time: "4m ago",
        highlight: "milestone",
      }),
      entry("j1-t7", "Writing cleanup summary", "Report Agent", "running", {
        meta: "ETA 8 min",
        time: "now",
        highlight: "running",
      }),
      entry("j1-t8", "Waiting for final validation", "QA Agent", "queued", { time: "—" }),
    ],
    footer: {
      eta: "~22 min",
      tokensTools: "42k tok · 6 tools",
      phase: "Remediation",
      completionPct: 78,
    },
  },
  j2: {
    id: "j2",
    title: "Competitor Research Pack",
    client: "LymeShot",
    status: "Analyzing",
    priority: "Medium",
    agents: ["Research Agent", "Market Agent", "Analyst Agent"],
    agentIds: [],
    startedAgo: "47 min ago",
    tasks: [
      entry("j2-t1", "Identified 24 competing tools", "Research Agent", "done", { time: "40m ago" }),
      entry("j2-t2", "Grouped by pricing model", "Analyst Agent", "done", { meta: "4 tiers", time: "35m ago" }),
      entry("j2-t3", "Extracted core feature sets", "Research Agent", "done", { time: "28m ago" }),
      entry("j2-t4", "Compared onboarding flows", "Market Agent", "done", { time: "22m ago" }),
      entry("j2-t5", "Scored landing page clarity", "Analyst Agent", "done", { meta: "24 pages", time: "18m ago" }),
      entry("j2-t6", "Drafted positioning gaps", "Research Agent", "done", {
        highlight: "milestone",
        time: "12m ago",
      }),
      entry("j2-t7", "Building executive summary", "Report Agent", "running", {
        meta: "ETA 15 min",
        time: "now",
        highlight: "running",
      }),
      entry("j2-t8", "Charts & appendix queue", "Analyst Agent", "queued"),
    ],
    footer: {
      eta: "~40 min",
      tokensTools: "68k tok · 4 tools",
      phase: "Synthesis",
      completionPct: 62,
    },
  },
  j3: {
    id: "j3",
    title: "Outbound Lead System Setup",
    client: "OpenClaw Studio",
    status: "Queued",
    priority: "Medium",
    agents: ["Automation Agent", "CRM Agent"],
    agentIds: [],
    startedAgo: "Starting…",
    tasks: [
      entry("j3-t1", "Waiting for job slot", "Automation Agent", "blocked", {
        meta: "Capacity",
        highlight: "blocked",
      }),
      entry("j3-t2", "Loading required tools", "Automation Agent", "running", { time: "now" }),
      entry("j3-t3", "Validating CRM fields", "CRM Agent", "queued"),
      entry("j3-t4", "Preparing enrichment workflow", "Automation Agent", "queued"),
      entry("j3-t5", "Webhook dry-run", "CRM Agent", "queued"),
    ],
    footer: {
      eta: "~2h",
      tokensTools: "2.1k tok · 2 tools",
      phase: "Warmup",
      completionPct: 8,
    },
  },
  j4: {
    id: "j4",
    title: "Product Landing Page",
    client: "Helio Labs",
    status: "In Progress",
    priority: "High",
    agents: ["Builder Agent", "Copy Agent", "QA Agent"],
    agentIds: [],
    startedAgo: "2h ago",
    tasks: [
      entry("j4-t1", "Pulled brand tokens from design system", "Builder Agent", "done", { time: "1h 50m ago" }),
      entry("j4-t2", "Drafted hero + value props", "Copy Agent", "done", { meta: "6 variants", time: "1h 20m ago" }),
      entry("j4-t3", "Built responsive shell", "Builder Agent", "done", { meta: "11 sections", time: "55m ago" }),
      entry("j4-t4", "Lighthouse perf pass", "QA Agent", "done", { meta: "Score 94", time: "40m ago" }),
      entry("j4-t5", "A/B headline experiment", "Copy Agent", "running", {
        highlight: "running",
        time: "now",
      }),
      entry("j4-t6", "Form analytics wiring", "Builder Agent", "queued"),
      entry("j4-t7", "Final accessibility sweep", "QA Agent", "queued"),
    ],
    footer: {
      eta: "~35 min",
      tokensTools: "31k tok · 5 tools",
      phase: "Build",
      completionPct: 71,
    },
  },
  j5: {
    id: "j5",
    title: "SEO Content Cluster",
    client: "Summit Outdoor",
    status: "Reviewing",
    priority: "Medium",
    agents: ["SEO Agent", "Copy Agent", "Research Agent"],
    agentIds: [],
    startedAgo: "6h ago",
    tasks: [
      entry("j5-t1", "Mapped 32 target keywords", "SEO Agent", "done", { time: "5h ago" }),
      entry("j5-t2", "Clustered by intent", "Research Agent", "done", { meta: "8 clusters", time: "4h ago" }),
      entry("j5-t3", "Wrote pillar + 6 spokes", "Copy Agent", "done", { meta: "~14k words", time: "2h ago" }),
      entry("j5-t5", "Internal link graph", "SEO Agent", "done", { highlight: "milestone", time: "90m ago" }),
      entry("j5-t6", "Editorial review queue", "Copy Agent", "running", { time: "now" }),
      entry("j5-t7", "Schema markup batch", "SEO Agent", "queued"),
      entry("j5-t8", "Publish schedule", "Research Agent", "queued"),
    ],
    footer: {
      eta: "~50 min",
      tokensTools: "89k tok · 7 tools",
      phase: "Review",
      completionPct: 88,
    },
  },
  j6: {
    id: "j6",
    title: "Legal Intake Summary",
    client: "Bridge Counsel LLP",
    status: "Running",
    priority: "High",
    agents: ["Analyst Agent", "Report Agent"],
    agentIds: [],
    startedAgo: "33 min ago",
    tasks: [
      entry("j6-t1", "Ingested 14 PDF exhibits", "Analyst Agent", "done", { meta: "OCR + redact", time: "28m ago" }),
      entry("j6-t2", "Extracted party timeline", "Analyst Agent", "done", { time: "20m ago" }),
      entry("j6-t3", "Flagged privilege segments", "Analyst Agent", "running", {
        highlight: "running",
        time: "now",
      }),
      entry("j6-t4", "Draft one-page intake", "Report Agent", "queued"),
      entry("j6-t5", "Partner review packet", "Report Agent", "queued"),
      entry("j6-t6", "Citation check", "Analyst Agent", "queued"),
    ],
    footer: {
      eta: "~1h 10m",
      tokensTools: "19k tok · 3 tools",
      phase: "Analysis",
      completionPct: 45,
    },
  },
  j7: {
    id: "j7",
    title: "CRM Workflow Automation",
    client: "Fleetline Logistics",
    status: "Queued",
    priority: "Low",
    agents: ["CRM Agent", "Automation Agent", "QA Agent"],
    agentIds: [],
    startedAgo: "—",
    tasks: [
      entry("j7-t1", "Queued behind priority jobs", "Automation Agent", "queued", { meta: "Position 3" }),
      entry("j7-t2", "Sandbox CRM clone ready", "CRM Agent", "done", { time: "scheduled" }),
      entry("j7-t3", "Stage mapping draft", "CRM Agent", "queued"),
      entry("j7-t4", "Error path tests", "QA Agent", "queued"),
    ],
    footer: {
      eta: "~4h",
      tokensTools: "—",
      phase: "Queue",
      completionPct: 5,
    },
  },
  j8: {
    id: "j8",
    title: "Draft Outreach Campaign",
    client: "Northwind Bio",
    status: "In Progress",
    priority: "Medium",
    agents: ["Outreach Agent", "Copy Agent", "Research Agent"],
    agentIds: [],
    startedAgo: "1h 12m ago",
    tasks: [
      entry("j8-t1", "Built ICP list 240 contacts", "Research Agent", "done", { time: "1h ago" }),
      entry("j8-t2", "Personalization tokens mapped", "Outreach Agent", "done", { meta: "12 fields", time: "50m ago" }),
      entry("j8-t3", "3-sequence email draft", "Copy Agent", "done", { time: "35m ago" }),
      entry("j8-t4", "Compliance language pass", "Copy Agent", "running", {
        highlight: "running",
        time: "now",
      }),
      entry("j8-t5", "Send-time optimization", "Outreach Agent", "queued"),
      entry("j8-t6", "Reply sentiment classifier", "Research Agent", "queued"),
      entry("j8-t7", "Launch checklist", "Outreach Agent", "queued"),
    ],
    footer: {
      eta: "~55 min",
      tokensTools: "27k tok · 4 tools",
      phase: "Copy",
      completionPct: 58,
    },
  },
};

/** Extra log lines appended in demo mode (per job id), consumed in order */
export const DEMO_APPEND_LINES: Record<string, TaskLogEntry[]> = {
  j1: [
    entry("j1-d1", "Packaged evidence ZIP for client", "Report Agent", "done", { time: "just now" }),
    entry("j1-d2", "Submitted final validation request", "Report Agent", "running", { highlight: "running" }),
  ],
  j2: [
    entry("j2-d1", "Embedded competitor matrix", "Analyst Agent", "done"),
    entry("j2-d2", "Exported PDF brief", "Report Agent", "running", { highlight: "running" }),
  ],
  j3: [
    entry("j3-d1", "Job slot acquired", "Automation Agent", "done", { highlight: "milestone" }),
    entry("j3-d2", "Syncing Salesforce objects", "CRM Agent", "running", { highlight: "running" }),
  ],
  j4: [
    entry("j4-d1", "Winner headline locked", "Copy Agent", "done", { meta: "Variant B" }),
  ],
  j5: [
    entry("j5-d1", "Legal skim on claims", "Copy Agent", "done"),
  ],
  j6: [
    entry("j6-d1", "Privilege log exported", "Analyst Agent", "done"),
  ],
  j7: [
    entry("j7-d1", "Kickoff checklist sent", "CRM Agent", "running"),
  ],
  j8: [
    entry("j8-d1", "Compliance approved copy blocks", "Copy Agent", "done", { highlight: "milestone" }),
  ],
};

export function cloneJob(job: Job): Job {
  return {
    ...job,
    agents: [...job.agents],
    agentIds: [...job.agentIds],
    primaryAgentId: job.primaryAgentId,
    primaryAgentName: job.primaryAgentName,
    tasks: job.tasks.map((t) => ({ ...t })),
    footer: { ...job.footer },
  };
}

export function jobFromSeed(id: string): Job {
  const seed = JOB_SEEDS[id];
  if (!seed) throw new Error(`Unknown job id: ${id}`);
  return cloneJob(seed);
}

/** All jobs shown in the dashboard live stream (scroll strip order, left → right). */
export const BOARD_JOB_IDS = [
  "j1",
  "j2",
  "j3",
  "j4",
  "j5",
  "j6",
  "j7",
  "j8",
] as const;

export type BoardJobId = (typeof BOARD_JOB_IDS)[number];

/** Initial board: first three visible, rest in FIFO queue */
export function initialBoardState(): { visibleIds: [string, string, string]; queueIds: string[] } {
  return {
    visibleIds: ["j1", "j2", "j3"],
    queueIds: ["j4", "j5", "j6", "j7", "j8"],
  };
}
