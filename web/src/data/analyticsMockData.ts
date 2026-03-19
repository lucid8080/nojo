/** MOCK — replace with API. Debug: all series keyed by agentId where filtered. */

import agencyAgentsPayload from "./agencyAgents.json";
import { getCategoryChartHex } from "@/lib/categoryColors";

function buildCategoryDistribution(): {
  category: string;
  count: number;
  fill: string;
}[] {
  const counts = new Map<string, number>();
  for (const a of agencyAgentsPayload.agents) {
    const c = a.categoryLabel;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({
      category,
      count,
      fill: getCategoryChartHex(category),
    }))
    .sort((a, b) => b.count - a.count);
}

/** Aggregated from marketplace agents — chart colors match getCategoryChartHex */
export const categoryDistribution = buildCategoryDistribution();

export const analyticsTeams = [
  { id: "all", label: "All teams" },
  { id: "growth", label: "Growth" },
  { id: "platform", label: "Platform" },
  { id: "ops", label: "Ops" },
] as const;

export const analyticsAgents = [
  { id: "ag1", name: "Nexus-7", teamId: "growth" },
  { id: "ag2", name: "CodeWeaver", teamId: "platform" },
  { id: "ag3", name: "SupportMind", teamId: "ops" },
  { id: "ag4", name: "DeployBot", teamId: "platform" },
  { id: "ag5", name: "Researcher-X", teamId: "growth" },
] as const;

export const analyticsTaskTypes = [
  "All types",
  "Research",
  "Code",
  "Support",
  "Deploy",
  "Review",
] as const;

export type ActivityStatus = "success" | "failed" | "retrying";

export type ActivityEntry = {
  id: string;
  agentId: string;
  agentName: string;
  teamId: string;
  taskType: string;
  task: string;
  status: ActivityStatus;
  at: string;
};

export const analyticsKpi = {
  current: {
    totalTasks: 1842,
    successRate: 94.2,
    avgResponseMs: 1280,
    totalTokens: 42_800_000,
    estimatedCostUsd: 384.6,
    activeAgents: 12,
    /** Mock: estimated human-hours saved vs manual baseline */
    timeSavedHours: 186.5,
  },
  previous: {
    totalTasks: 1621,
    successRate: 91.8,
    avgResponseMs: 1450,
    totalTokens: 38_200_000,
    estimatedCostUsd: 342.1,
    activeAgents: 11,
    timeSavedHours: 158.2,
  },
} as const;

function pctDelta(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}

export function kpiDeltas() {
  const c = analyticsKpi.current;
  const p = analyticsKpi.previous;
  return {
    totalTasks: pctDelta(c.totalTasks, p.totalTasks),
    successRate: pctDelta(c.successRate, p.successRate),
    avgResponseMs: pctDelta(c.avgResponseMs, p.avgResponseMs),
    totalTokens: pctDelta(c.totalTokens, p.totalTokens),
    estimatedCostUsd: pctDelta(c.estimatedCostUsd, p.estimatedCostUsd),
    activeAgents: pctDelta(c.activeAgents, p.activeAgents),
    timeSavedHours: pctDelta(c.timeSavedHours, p.timeSavedHours),
  };
}

/** Daily aggregates — workspace total */
export const dailyPerformance = [
  { date: "Mar 12", tasks: 142, success: 132, failed: 10, avgMs: 1380, tokens: 2_850_000 },
  { date: "Mar 13", tasks: 156, success: 148, failed: 8, avgMs: 1310, tokens: 3_020_000 },
  { date: "Mar 14", tasks: 168, success: 158, failed: 10, avgMs: 1250, tokens: 3_180_000 },
  { date: "Mar 15", tasks: 151, success: 142, failed: 9, avgMs: 1290, tokens: 2_940_000 },
  { date: "Mar 16", tasks: 189, success: 179, failed: 10, avgMs: 1220, tokens: 3_450_000 },
  { date: "Mar 17", tasks: 201, success: 192, failed: 9, avgMs: 1180, tokens: 3_620_000 },
  { date: "Mar 18", tasks: 178, success: 170, failed: 8, avgMs: 1240, tokens: 3_210_000 },
] as const;

/** Per-agent daily (for filtered charts) — scaled from total */
const agentScale: Record<string, number> = {
  ag1: 0.22,
  ag2: 0.28,
  ag3: 0.18,
  ag4: 0.15,
  ag5: 0.17,
};

export function getDailyForAgent(agentId: string | "all") {
  if (agentId === "all") {
    return dailyPerformance.map((d) => ({ ...d }));
  }
  const s = agentScale[agentId] ?? 0.2;
  return dailyPerformance.map((d) => ({
    date: d.date,
    tasks: Math.max(8, Math.round(d.tasks * s)),
    success: Math.max(6, Math.round(d.success * s)),
    failed: Math.max(0, Math.round(d.failed * s)),
    avgMs: Math.round(d.avgMs * (0.92 + (agentId.charCodeAt(2) % 5) * 0.02)),
    tokens: Math.round(d.tokens * s),
  }));
}

export const taskTypeDistribution = [
  { type: "Research", count: 412, fill: "#0ea5e9" },
  { type: "Code", count: 538, fill: "#6366f1" },
  { type: "Support", count: 356, fill: "#14b8a6" },
  { type: "Deploy", count: 289, fill: "#f59e0b" },
  { type: "Review", count: 247, fill: "#a855f7" },
] as const;

export type AgentComparisonRow = {
  id: string;
  name: string;
  role: string;
  /** Marketplace category for row accent color */
  categoryLabel: string;
  tasksCompleted: number;
  successRate: number;
  avgResponseMs: number;
  tokenUsage: number;
  costUsd: number;
  status: "Active" | "Idle" | "Degraded";
};

export const agentComparisonRows: AgentComparisonRow[] = [
  {
    id: "ag1",
    name: "Nexus-7",
    role: "Orchestration",
    categoryLabel: "STRATEGY",
    tasksCompleted: 412,
    successRate: 96.1,
    avgResponseMs: 1120,
    tokenUsage: 9_420_000,
    costUsd: 84.78,
    status: "Active",
  },
  {
    id: "ag2",
    name: "CodeWeaver",
    role: "Engineering",
    categoryLabel: "ENGINEERING",
    tasksCompleted: 498,
    successRate: 93.4,
    avgResponseMs: 1380,
    tokenUsage: 12_100_000,
    costUsd: 108.9,
    status: "Active",
  },
  {
    id: "ag3",
    name: "SupportMind",
    role: "Customer success",
    categoryLabel: "SUPPORT",
    tasksCompleted: 331,
    successRate: 97.0,
    avgResponseMs: 890,
    tokenUsage: 5_200_000,
    costUsd: 46.8,
    status: "Active",
  },
  {
    id: "ag4",
    name: "DeployBot",
    role: "Release automation",
    categoryLabel: "ENGINEERING",
    tasksCompleted: 287,
    successRate: 91.2,
    avgResponseMs: 1520,
    tokenUsage: 6_800_000,
    costUsd: 61.2,
    status: "Degraded",
  },
  {
    id: "ag5",
    name: "Researcher-X",
    role: "Market intel",
    categoryLabel: "MARKETING",
    tasksCompleted: 314,
    successRate: 94.9,
    avgResponseMs: 1650,
    tokenUsage: 9_280_000,
    costUsd: 83.52,
    status: "Idle",
  },
];

export const costPerAgent = agentComparisonRows.map((r) => ({
  agent: r.name,
  agentId: r.id,
  categoryLabel: r.categoryLabel,
  tokens: r.tokenUsage,
  costUsd: r.costUsd,
}));

const taskPool = [
  "Summarize competitor landing pages",
  "Refactor auth middleware",
  "Ticket triage: billing export",
  "Canary deploy us-east-1",
  "PR review: API pagination",
  "Scrape pricing table (3 sites)",
  "Generate weekly digest",
  "Run integration test suite",
  "Draft outage comms",
  "Vector index rebuild",
];

function seedActivity(): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  const agents = [...analyticsAgents];
  const statuses: ActivityStatus[] = ["success", "success", "success", "failed", "retrying"];
  let t = Date.now() - 1000 * 60 * 90;
  for (let i = 0; i < 48; i++) {
    const a = agents[i % agents.length];
    const st = statuses[i % statuses.length];
    const types = ["Research", "Code", "Support", "Deploy", "Review"];
    entries.push({
      id: `act-${i}`,
      agentId: a.id,
      agentName: a.name,
      teamId: a.teamId,
      taskType: types[i % types.length],
      task: taskPool[i % taskPool.length],
      status: st,
      at: new Date(t).toISOString(),
    });
    t -= (2 + (i % 7)) * 60 * 1000;
  }
  return entries;
}

export const mockActivityFeed = seedActivity();

export type AgentDrillDown = {
  name: string;
  role: string;
  taskLogs: { id: string; message: string; at: string; level: "info" | "warn" | "error" }[];
  tokenPerRequest: { id: string; request: string; tokens: number; at: string }[];
  failureReasons: { id: string; reason: string; count: number; lastAt: string }[];
  toolUsage: { tool: string; calls: number; share: number }[];
};

export const agentDrillDownById: Record<string, AgentDrillDown> = {
  ag1: {
    name: "Nexus-7",
    role: "Orchestration",
    taskLogs: [
      { id: "l1", message: " Routed job #8821 to CodeWeaver", at: "2026-03-18T14:02:00Z", level: "info" },
      { id: "l2", message: " Policy check passed (PII scope)", at: "2026-03-18T14:01:12Z", level: "info" },
      { id: "l3", message: " Retrying subtask after timeout", at: "2026-03-18T13:58:00Z", level: "warn" },
    ],
    tokenPerRequest: [
      { id: "r1", request: "plan_batch", tokens: 4200, at: "2026-03-18T14:02:00Z" },
      { id: "r2", request: "delegate_task", tokens: 1800, at: "2026-03-18T14:01:00Z" },
      { id: "r3", request: "summarize_context", tokens: 9100, at: "2026-03-18T13:55:00Z" },
    ],
    failureReasons: [
      { id: "f1", reason: "Downstream rate limit (429)", count: 4, lastAt: "2026-03-18T11:00:00Z" },
      { id: "f2", reason: "Invalid tool schema response", count: 2, lastAt: "2026-03-17T09:30:00Z" },
    ],
    toolUsage: [
      { tool: "delegate", calls: 842, share: 38 },
      { tool: "search", calls: 512, share: 23 },
      { tool: "memory_read", calls: 620, share: 28 },
      { tool: "other", calls: 198, share: 11 },
    ],
  },
  ag2: {
    name: "CodeWeaver",
    role: "Engineering",
    taskLogs: [
      { id: "l1", message: " Applied patch to src/api/users.ts", at: "2026-03-18T13:45:00Z", level: "info" },
      { id: "l2", message: " Tests failed: snapshot mismatch", at: "2026-03-18T13:40:00Z", level: "error" },
    ],
    tokenPerRequest: [
      { id: "r1", request: "code_edit", tokens: 15200, at: "2026-03-18T13:45:00Z" },
      { id: "r2", request: "explain_diff", tokens: 6800, at: "2026-03-18T13:42:00Z" },
    ],
    failureReasons: [
      { id: "f1", reason: "Test runner OOM", count: 3, lastAt: "2026-03-18T08:00:00Z" },
    ],
    toolUsage: [
      { tool: "read_file", calls: 2100, share: 42 },
      { tool: "run_terminal", calls: 980, share: 20 },
      { tool: "apply_patch", calls: 1200, share: 24 },
      { tool: "other", calls: 680, share: 14 },
    ],
  },
  ag3: {
    name: "SupportMind",
    role: "Customer success",
    taskLogs: [
      { id: "l1", message: " Escalated ticket #4412 to human", at: "2026-03-18T12:20:00Z", level: "info" },
    ],
    tokenPerRequest: [
      { id: "r1", request: "draft_reply", tokens: 2100, at: "2026-03-18T12:20:00Z" },
    ],
    failureReasons: [],
    toolUsage: [
      { tool: "crm_lookup", calls: 1200, share: 55 },
      { tool: "kb_search", calls: 800, share: 37 },
      { tool: "other", calls: 180, share: 8 },
    ],
  },
  ag4: {
    name: "DeployBot",
    role: "Release automation",
    taskLogs: [
      { id: "l1", message: " Helm apply stalled — cluster unreachable", at: "2026-03-18T10:00:00Z", level: "error" },
    ],
    tokenPerRequest: [
      { id: "r1", request: "deploy_plan", tokens: 5400, at: "2026-03-18T10:00:00Z" },
    ],
    failureReasons: [
      { id: "f1", reason: "K8s API timeout", count: 8, lastAt: "2026-03-18T10:00:00Z" },
    ],
    toolUsage: [
      { tool: "kubectl", calls: 450, share: 48 },
      { tool: "helm", calls: 320, share: 34 },
      { tool: "other", calls: 170, share: 18 },
    ],
  },
  ag5: {
    name: "Researcher-X",
    role: "Market intel",
    taskLogs: [
      { id: "l1", message: " Completed pricing matrix (12 competitors)", at: "2026-03-18T09:00:00Z", level: "info" },
    ],
    tokenPerRequest: [
      { id: "r1", request: "web_scrape_batch", tokens: 22400, at: "2026-03-18T09:00:00Z" },
    ],
    failureReasons: [
      { id: "f1", reason: "CAPTCHA block", count: 5, lastAt: "2026-03-17T16:00:00Z" },
    ],
    toolUsage: [
      { tool: "browser", calls: 890, share: 52 },
      { tool: "extract", calls: 510, share: 30 },
      { tool: "other", calls: 310, share: 18 },
    ],
  },
};

export const insightsPanel = {
  alerts: [
    "DeployBot failure rate spiked +4.2% vs last week (K8s timeouts).",
    "Token burn for Researcher-X is 18% above team budget cap.",
  ],
  recommendations: [
    "Enable retry backoff on DeployBot’s kubectl tool calls.",
    "Route low-priority research jobs to a smaller model tier after 22:00 UTC.",
    "Add caching for SupportMind CRM lookups — 40% repeat queries.",
  ],
  highlights: [
    "SupportMind held 97% success rate with sub-900ms p50 response.",
    "Nexus-7 cleared 400+ orchestration tasks with zero policy violations today.",
  ],
} as const;

export function filterActivity(
  feed: ActivityEntry[],
  opts: {
    agentId: string;
    teamId: string;
    taskType: string;
  },
): ActivityEntry[] {
  return feed.filter((e) => {
    if (opts.agentId !== "all" && e.agentId !== opts.agentId) return false;
    if (opts.teamId !== "all" && e.teamId !== opts.teamId) return false;
    if (opts.taskType !== "All types" && e.taskType !== opts.taskType) return false;
    return true;
  });
}

export function filterAgentRows(
  rows: AgentComparisonRow[],
  agentId: string,
  teamId: string,
): AgentComparisonRow[] {
  let r = rows;
  if (agentId !== "all") r = r.filter((x) => x.id === agentId);
  if (teamId !== "all") {
    const teamAgents = new Set<string>(
      analyticsAgents.filter((a) => a.teamId === teamId).map((a) => a.id),
    );
    r = r.filter((x) => teamAgents.has(x.id));
  }
  return r;
}

export function filterCostRows(
  rows: typeof costPerAgent,
  agentId: string,
  teamId: string,
) {
  let r = [...rows];
  if (agentId !== "all") r = r.filter((x) => x.agentId === agentId);
  if (teamId !== "all") {
    const teamAgents = new Set<string>(
      analyticsAgents.filter((a) => a.teamId === teamId).map((a) => a.id),
    );
    r = r.filter((x) => teamAgents.has(x.agentId));
  }
  return r;
}
