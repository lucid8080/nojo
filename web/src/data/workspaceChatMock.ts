/** Agent / conversation status shown in workspace UI */
export type WorkspaceStatus =
  | "Thinking"
  | "Working"
  | "Waiting for Reply"
  | "Completed";

export type WorkspaceAgent = {
  id: string;
  name: string;
  initials: string;
  role: string;
  /** Tailwind bg class fragment e.g. "bg-violet-500" */
  avatarClass: string;
};

export type Conversation = {
  id: string;
  jobTitle: string;
  agents: WorkspaceAgent[];
  primaryAgentId: string;
  status: WorkspaceStatus;
  lastPreview: string;
  unreadCount: number;
  /** Relative label for list */
  timestamp: string;
  archived: boolean;
};

export type MessageBase = {
  id: string;
  createdAt: string;
};

export type UserMessage = MessageBase & {
  type: "user";
  body: string;
};

export type AgentMessage = MessageBase & {
  type: "agent";
  agentId: string;
  body: string;
  agentStatus?: WorkspaceStatus;
};

export type SystemMessageData = MessageBase & {
  type: "system";
  body: string;
  /** Optional: OpenClaw run id for "Check status" UI affordance. */
  runId?: string;
  /** Optional: initial run status for the same affordance. */
  runStatus?: string;
};

export type ToolLogMessage = MessageBase & {
  type: "tool_log";
  toolName: string;
  command: string;
  outputSnippet: string;
  success: boolean;
  agentId?: string;
};

export type DeliverableMessage = MessageBase & {
  type: "deliverable";
  fileName: string;
  fileType: string;
  version: string;
  agentId?: string;
};

export type ApprovalMessage = MessageBase & {
  type: "approval";
  title: string;
  description: string;
  requesterAgentId: string;
};

export type WorkspaceMessage =
  | UserMessage
  | AgentMessage
  | SystemMessageData
  | ToolLogMessage
  | DeliverableMessage
  | ApprovalMessage;

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
  assigneeAgentId?: string;
};

export type ContextFile = {
  id: string;
  name: string;
  size: string;
};

export type ActivityEvent = {
  id: string;
  label: string;
  time: string;
  tone?: "default" | "success" | "warning";
};

export type ContextDeliverable = {
  id: string;
  name: string;
  status: "Ready" | "Draft" | "Approved";
};

export type JobContext = {
  conversationId: string;
  title: string;
  description: string;
  agentIds: string[];
  dueDate: string;
  progressPercent: number;
  files: ContextFile[];
  subtasks: Subtask[];
  activity: ActivityEvent[];
  deliverables: ContextDeliverable[];
};

export const workspaceAgents: WorkspaceAgent[] = [
  {
    id: "nova",
    name: "Nova Chen",
    initials: "NC",
    role: "Content Strategist",
    avatarClass: "bg-violet-500",
  },
  {
    id: "kite",
    name: "Kite Park",
    initials: "KP",
    role: "Research Analyst",
    avatarClass: "bg-sky-500",
  },
  {
    id: "mira",
    name: "Mira Okonkwo",
    initials: "MO",
    role: "QA & Compliance",
    avatarClass: "bg-emerald-500",
  },
  {
    id: "ellis",
    name: "Ellis Rowe",
    initials: "ER",
    role: "Pipeline Engineer",
    avatarClass: "bg-amber-500",
  },
  {
    id: "juno",
    name: "Juno Blake",
    initials: "JB",
    role: "Support Triage",
    avatarClass: "bg-rose-500",
  },
];

function agent(id: string): WorkspaceAgent {
  const a = workspaceAgents.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown agent ${id}`);
  return a;
}

/** Primary multi-agent thread: Q2 content refresh */
export const primaryConversationMessages: WorkspaceMessage[] = [
  {
    id: "m1",
    type: "system",
    createdAt: "Today 9:02 AM",
    body: "Job room created · Q2 narrative refresh",
  },
  {
    id: "m2",
    type: "user",
    createdAt: "Today 9:04 AM",
    body: "I need a refreshed positioning doc for our enterprise tier. Research current competitor messaging, then draft a 2-pager. Mira should sanity-check claims before we ship.",
  },
  {
    id: "m3",
    type: "agent",
    agentId: "kite",
    createdAt: "Today 9:05 AM",
    agentStatus: "Thinking",
    body: "On it. I'll pull top 5 competitor homepages + G2 positioning blurbs, then summarize themes in a table.",
  },
  {
    id: "m4",
    type: "tool_log",
    createdAt: "Today 9:06 AM",
    toolName: "web.fetch_batch",
    command: "targets: acme-corp.com, rival.io, zenith-saas.com …",
    outputSnippet: "200 OK · 5 pages · 42.1k tokens summarized",
    success: true,
    agentId: "kite",
  },
  {
    id: "m5",
    type: "agent",
    agentId: "kite",
    createdAt: "Today 9:18 AM",
    agentStatus: "Working",
    body: "Research pass done. Key pattern: everyone leads with “AI-native” and security certs; few mention implementation time. I'm handing off to Nova for narrative.",
  },
  {
    id: "m6",
    type: "system",
    createdAt: "Today 9:18 AM",
    body: "Nova Chen joined · assigned as lead writer",
  },
  {
    id: "m7",
    type: "agent",
    agentId: "nova",
    createdAt: "Today 9:22 AM",
    agentStatus: "Working",
    body: "Drafting v1: hero = speed-to-value + human-in-the-loop. Pulling 3 bullets from Kite's table into the competitive section.",
  },
  {
    id: "m8",
    type: "tool_log",
    createdAt: "Today 9:28 AM",
    toolName: "docs.generate",
    command: "template: enterprise_2pager · tone: confident-calm",
    outputSnippet: "Generated 1,240 words · 2 charts placeholders",
    success: true,
    agentId: "nova",
  },
  {
    id: "m9",
    type: "deliverable",
    createdAt: "Today 9:35 AM",
    fileName: "Q2_Enterprise_Positioning_v1.docx",
    fileType: "docx",
    version: "v1.0 — internal draft",
    agentId: "nova",
  },
  {
    id: "m10",
    type: "system",
    createdAt: "Today 9:40 AM",
    body: "Mira Okonkwo added for compliance review",
  },
  {
    id: "m11",
    type: "agent",
    agentId: "mira",
    createdAt: "Today 9:42 AM",
    agentStatus: "Thinking",
    body: "Scanning claims against our approved fact sheet (FY24). One superlative in paragraph 2 needs a citation or softening.",
  },
  {
    id: "m12",
    type: "agent",
    agentId: "mira",
    createdAt: "Today 9:51 AM",
    agentStatus: "Waiting for Reply",
    body: "Flagged: “fastest implementation in category” — suggest replacing with “median go-live under 30 days (n=12 customers).” Awaiting your call on tone.",
  },
  {
    id: "m13",
    type: "user",
    createdAt: "Today 10:02 AM",
    body: "Use the median stat. Keep the sentence punchy.",
  },
  {
    id: "m14",
    type: "agent",
    agentId: "nova",
    createdAt: "Today 10:05 AM",
    agentStatus: "Working",
    body: "Updated copy and exported v1.1. Pushing approval card for publish to Notion + sales deck.",
  },
  {
    id: "m15",
    type: "approval",
    createdAt: "Today 10:08 AM",
    title: "Publish Q2 positioning pack",
    description:
      "Approve release of Q2_Enterprise_Positioning_v1.1.docx to shared drive and #sales-announcements.",
    requesterAgentId: "nova",
  },
];

export const workspaceConversations: Conversation[] = [
  {
    id: "c1",
    jobTitle: "Q2 Enterprise positioning refresh",
    agents: [agent("nova"), agent("kite"), agent("mira")],
    primaryAgentId: "nova",
    status: "Waiting for Reply",
    lastPreview: "Mira: Flagged superlative — awaiting your call on tone…",
    unreadCount: 2,
    timestamp: "10m ago",
    archived: false,
  },
  {
    id: "c2",
    jobTitle: "Pipeline health weekly digest",
    agents: [agent("ellis")],
    primaryAgentId: "ellis",
    status: "Working",
    lastPreview: "Ellis: Aggregating Snowflake + HubSpot deltas…",
    unreadCount: 0,
    timestamp: "32m ago",
    archived: false,
  },
  {
    id: "c3",
    jobTitle: "Support inbox triage — Tier 1",
    agents: [agent("juno")],
    primaryAgentId: "juno",
    status: "Thinking",
    lastPreview: "Juno: 6 threads need human escalation…",
    unreadCount: 4,
    timestamp: "1h ago",
    archived: false,
  },
  {
    id: "c4",
    jobTitle: "Agent hiring brief — SDR bot",
    agents: [agent("nova"), agent("kite")],
    primaryAgentId: "kite",
    status: "Working",
    lastPreview: "You: Can we add Spanish coverage?",
    unreadCount: 1,
    timestamp: "2h ago",
    archived: false,
  },
  {
    id: "c5",
    jobTitle: "Brand voice guidelines update",
    agents: [agent("nova")],
    primaryAgentId: "nova",
    status: "Completed",
    lastPreview: "Nova: Final PDF uploaded to brand portal.",
    unreadCount: 0,
    timestamp: "Yesterday",
    archived: true,
  },
  {
    id: "c6",
    jobTitle: "SOC2 evidence collection",
    agents: [agent("mira"), agent("ellis")],
    primaryAgentId: "mira",
    status: "Completed",
    lastPreview: "Mira: Audit pack zipped · ticket CLOSED.",
    unreadCount: 0,
    timestamp: "Mar 14",
    archived: true,
  },
  {
    id: "c7",
    jobTitle: "Onboarding email sequence v3",
    agents: [agent("nova"), agent("juno")],
    primaryAgentId: "juno",
    status: "Waiting for Reply",
    lastPreview: "Juno: A/B subject lines ready for pick…",
    unreadCount: 0,
    timestamp: "Mar 13",
    archived: false,
  },
];

export const workspaceMessagesByConversation: Record<string, WorkspaceMessage[]> =
  {
    c1: primaryConversationMessages,
    c2: [
      {
        id: "e1",
        type: "user",
        createdAt: "Today 8:00 AM",
        body: "Send the usual weekly pipeline digest by 5pm. Flag anything >15% variance.",
      },
      {
        id: "e2",
        type: "agent",
        agentId: "ellis",
        createdAt: "Today 8:02 AM",
        agentStatus: "Working",
        body: "Running aggregation across Snowflake marts and HubSpot stages. ETA 45m.",
      },
      {
        id: "e3",
        type: "tool_log",
        createdAt: "Today 8:15 AM",
        toolName: "sql.run",
        command: "SELECT stage, COUNT(*) … GROUP BY week",
        outputSnippet: "12 rows · variance max +18% (enterprise)",
        success: true,
        agentId: "ellis",
      },
    ],
    c3: [
      {
        id: "j1",
        type: "agent",
        agentId: "juno",
        createdAt: "Today 7:30 AM",
        agentStatus: "Working",
        body: "Triaged 42 tickets. Six need your eyes — billing disputes and one enterprise SLA.",
      },
    ],
    c4: [
      {
        id: "h1",
        type: "user",
        createdAt: "Yesterday 4:00 PM",
        body: "Draft the SDR agent brief. Spanish support is a must-have.",
      },
      {
        id: "h2",
        type: "agent",
        agentId: "kite",
        createdAt: "Yesterday 4:20 PM",
        agentStatus: "Working",
        body: "Compiling reqs from 3 similar hires. Will post structured brief tomorrow AM.",
      },
    ],
    c5: [
      {
        id: "b1",
        type: "system",
        createdAt: "Mar 10",
        body: "Job marked completed",
      },
    ],
    c6: [
      {
        id: "s1",
        type: "system",
        createdAt: "Mar 14",
        body: "SOC2 evidence job archived",
      },
    ],
    c7: [
      {
        id: "o1",
        type: "agent",
        agentId: "juno",
        createdAt: "Mar 13",
        agentStatus: "Waiting for Reply",
        body: "Two subject lines: (A) You're in — next steps inside (B) Welcome — your workspace is ready",
      },
    ],
  };

export const workspaceJobContextByConversation: Record<string, JobContext> = {
  c1: {
    conversationId: "c1",
    title: "Q2 Enterprise positioning refresh",
    description:
      "Refresh enterprise tier narrative with competitive intel, legal-safe claims, and sales-ready 2-pager.",
    agentIds: ["nova", "kite", "mira"],
    dueDate: "Mar 21, 2025",
    progressPercent: 78,
    files: [
      { id: "f1", name: "FY24_fact_sheet.pdf", size: "2.1 MB" },
      { id: "f2", name: "competitor_raw_notes.md", size: "89 KB" },
      { id: "f3", name: "brand_voice_v2.pdf", size: "1.4 MB" },
    ],
    subtasks: [
      { id: "st1", title: "Competitor scan + theme table", done: true, assigneeAgentId: "kite" },
      { id: "st2", title: "Draft v1 positioning doc", done: true, assigneeAgentId: "nova" },
      { id: "st3", title: "Compliance review + claim edits", done: true, assigneeAgentId: "mira" },
      { id: "st4", title: "Client approval + publish", done: false, assigneeAgentId: "nova" },
    ],
    activity: [
      { id: "a1", label: "Kite completed research batch", time: "9:18 AM", tone: "success" },
      { id: "a2", label: "Nova generated v1 deliverable", time: "9:35 AM", tone: "success" },
      { id: "a3", label: "Mira flagged compliance item", time: "9:51 AM", tone: "warning" },
      { id: "a4", label: "You replied with copy direction", time: "10:02 AM" },
    ],
    deliverables: [
      { id: "d1", name: "Q2_Enterprise_Positioning_v1.docx", status: "Draft" },
      { id: "d2", name: "Q2_Enterprise_Positioning_v1.1.docx", status: "Ready" },
    ],
  },
  c2: {
    conversationId: "c2",
    title: "Pipeline health weekly digest",
    description: "Automated variance report across CRM and warehouse.",
    agentIds: ["ellis"],
    dueDate: "Today 5:00 PM",
    progressPercent: 45,
    files: [{ id: "f1", name: "digest_template.html", size: "12 KB" }],
    subtasks: [
      { id: "s1", title: "Pull warehouse metrics", done: true, assigneeAgentId: "ellis" },
      { id: "s2", title: "Merge HubSpot stages", done: false, assigneeAgentId: "ellis" },
      { id: "s3", title: "Email stakeholders", done: false, assigneeAgentId: "ellis" },
    ],
    activity: [
      { id: "a1", label: "Digest job started", time: "8:00 AM" },
      { id: "a2", label: "SQL batch succeeded", time: "8:15 AM", tone: "success" },
    ],
    deliverables: [{ id: "d1", name: "pipeline_week_11.html", status: "Draft" }],
  },
  c3: {
    conversationId: "c3",
    title: "Support inbox triage — Tier 1",
    description: "Route and summarize L1 support; escalate edge cases.",
    agentIds: ["juno"],
    dueDate: "Ongoing",
    progressPercent: 60,
    files: [],
    subtasks: [
      { id: "t1", title: "Batch classify open threads", done: true, assigneeAgentId: "juno" },
      { id: "t2", title: "Human escalation queue", done: false, assigneeAgentId: "juno" },
    ],
    activity: [{ id: "a1", label: "42 tickets triaged", time: "7:30 AM", tone: "success" }],
    deliverables: [],
  },
  c4: {
    conversationId: "c4",
    title: "Agent hiring brief — SDR bot",
    description: "Structured brief for hiring an SDR-focused agent with ES coverage.",
    agentIds: ["nova", "kite"],
    dueDate: "Mar 25, 2025",
    progressPercent: 25,
    files: [],
    subtasks: [
      { id: "t1", title: "Gather similar job specs", done: false, assigneeAgentId: "kite" },
      { id: "t2", title: "Draft brief doc", done: false, assigneeAgentId: "nova" },
    ],
    activity: [{ id: "a1", label: "Requirements noted (Spanish)", time: "Yesterday" }],
    deliverables: [],
  },
  c5: {
    conversationId: "c5",
    title: "Brand voice guidelines update",
    description: "Completed — guidelines PDF in brand portal.",
    agentIds: ["nova"],
    dueDate: "Mar 10, 2025",
    progressPercent: 100,
    files: [{ id: "f1", name: "brand_voice_final.pdf", size: "3.2 MB" }],
    subtasks: [
      { id: "t1", title: "Stakeholder interviews", done: true, assigneeAgentId: "nova" },
      { id: "t2", title: "Publish PDF", done: true, assigneeAgentId: "nova" },
    ],
    activity: [{ id: "a1", label: "Job completed", time: "Mar 10", tone: "success" }],
    deliverables: [{ id: "d1", name: "brand_voice_final.pdf", status: "Approved" }],
  },
  c6: {
    conversationId: "c6",
    title: "SOC2 evidence collection",
    description: "Audit evidence pack — archived.",
    agentIds: ["mira", "ellis"],
    dueDate: "Mar 14, 2025",
    progressPercent: 100,
    files: [{ id: "f1", name: "soc2_evidence_bundle.zip", size: "890 MB" }],
    subtasks: [
      { id: "t1", title: "Collect controls evidence", done: true, assigneeAgentId: "mira" },
      { id: "t2", title: "Zip and handoff", done: true, assigneeAgentId: "ellis" },
    ],
    activity: [{ id: "a1", label: "Audit pack delivered", time: "Mar 14", tone: "success" }],
    deliverables: [{ id: "d1", name: "soc2_evidence_bundle.zip", status: "Approved" }],
  },
  c7: {
    conversationId: "c7",
    title: "Onboarding email sequence v3",
    description: "A/B subject lines and sequence timing.",
    agentIds: ["nova", "juno"],
    dueDate: "Mar 20, 2025",
    progressPercent: 55,
    files: [],
    subtasks: [
      { id: "t1", title: "Draft sequence", done: true, assigneeAgentId: "juno" },
      { id: "t2", title: "Choose subject winner", done: false },
    ],
    activity: [{ id: "a1", label: "Subject lines proposed", time: "Mar 13" }],
    deliverables: [{ id: "d1", name: "onboarding_v3.html", status: "Draft" }],
  },
};

export function getMessagesForConversation(id: string): WorkspaceMessage[] {
  return workspaceMessagesByConversation[id] ?? [];
}

export function getJobContextForConversation(id: string): JobContext | null {
  return workspaceJobContextByConversation[id] ?? null;
}

export function getConversation(id: string): Conversation | undefined {
  return workspaceConversations.find((c) => c.id === id);
}
