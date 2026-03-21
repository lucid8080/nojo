/**
 * MOCK — replace with API. Shape intended for GET /team/agents, /team/stats, /team/importable-skills
 */

import type { CategoryColorName } from "@/lib/categoryColors";

export type TeamAgentStatus = "active" | "idle" | "busy" | "paused" | "archived";

export type TeamAgent = {
  id: string;
  name: string;
  /** Marketplace taxonomy label for category colors */
  categoryLabel: string;
  /** Optional override for avatar ring / initials background (see AVATAR_ACCENT_PALETTE). */
  avatarAccent?: CategoryColorName;
  role: string;
  status: TeamAgentStatus;
  description: string;
  skillTags: string[];
  currentTask: string | null;
  performanceLabel: string;
  initials: string;
  /** Image filename under public/avatar/ (e.g. 1.png) */
  avatarFile: string;
  objective: string;
  tools: string[];
  installedSkills: string[];
  taskQueue: { id: string; title: string; state: "queued" | "running" | "blocked" }[];
  performanceStats: { label: string; value: string }[];
  /** Set when mapping from workspace roster with empty source fields */
  rosterFieldsMissing?: { name?: boolean; role?: boolean };
  /** Optional label emoji (e.g. shown next to name). */
  emoji?: string;
  /** Tone / personality notes for prompts and admin context. */
  vibe?: string;
  /** Marketplace skill ids assigned in workspace metadata (resolved to names in `installedSkills`). */
  assignedSkillIds?: string[];
};

export type TeamStats = {
  totalAgents: number;
  activeNow: number;
  onTasks: number;
  savedSkillPacks: number;
};

export type ImportableSkill = {
  id: string;
  name: string;
  category: string;
  description: string;
  compatibility: string;
  icon: string;
};

export const teamStatsMock: TeamStats = {
  totalAgents: 8,
  activeNow: 5,
  onTasks: 3,
  savedSkillPacks: 12,
};

/** Legacy demo roster (fictional agents). Prefer `workspaceRosterToTeamAgents(NOJO_WORKSPACE_AGENTS)` in app routes. */
export const teamAgentsMock: TeamAgent[] = [
  {
    id: "ag-1",
    name: "Nexus",
    categoryLabel: "STRATEGY",
    role: "Research lead",
    status: "busy",
    description: "Synthesizes market intel and competitor briefs for GTM.",
    skillTags: ["Web research", "Summarization", "CRM"],
    currentTask: "Competitor pricing matrix — Q2",
    performanceLabel: "97% on-time (30d)",
    initials: "NX",
    avatarFile: "1.png",
    objective: "Deliver accurate, cited research packs within SLA for sales and product.",
    tools: ["Browser", "Notion", "Slack", "Sheets"],
    installedSkills: ["Deep research", "Citation mode", "CRM sync"],
    taskQueue: [
      { id: "q1", title: "Vendor comparison doc", state: "running" },
      { id: "q2", title: "Industry trends digest", state: "queued" },
    ],
    performanceStats: [
      { label: "Tasks completed", value: "142" },
      { label: "Avg. turnaround", value: "2.4h" },
      { label: "Quality score", value: "4.8" },
    ],
  },
  {
    id: "ag-2",
    name: "Ledger",
    categoryLabel: "SPECIALIZED",
    role: "Ops & billing",
    status: "active",
    description: "Reconciles usage, invoices, and subscription changes.",
    skillTags: ["Stripe", "Reporting", "Email"],
    currentTask: null,
    performanceLabel: "100% accuracy (audit)",
    initials: "LG",
    avatarFile: "2.png",
    objective: "Keep billing data consistent and flag anomalies before customer impact.",
    tools: ["Stripe", "Gmail", "Internal API"],
    installedSkills: ["Invoice parser", "Usage alerts"],
    taskQueue: [
      { id: "q3", title: "Monthly reconciliation", state: "queued" },
    ],
    performanceStats: [
      { label: "Invoices processed", value: "89" },
      { label: "Disputes resolved", value: "12" },
    ],
  },
  {
    id: "ag-3",
    name: "Scribe",
    categoryLabel: "MARKETING",
    role: "Content & docs",
    status: "idle",
    description: "Drafts help articles, release notes, and internal runbooks.",
    skillTags: ["Writing", "Brand voice", "Markdown"],
    currentTask: null,
    performanceLabel: "Idle — ready",
    initials: "SC",
    avatarFile: "3.png",
    objective: "Maintain documentation freshness aligned with brand guidelines.",
    tools: ["Docs", "GitHub", "Figma comments"],
    installedSkills: ["Tone matcher", "SEO basics"],
    taskQueue: [],
    performanceStats: [
      { label: "Docs shipped", value: "56" },
      { label: "Edit rounds avg.", value: "1.2" },
    ],
  },
  {
    id: "ag-4",
    name: "Pulse",
    categoryLabel: "SUPPORT",
    role: "Customer success",
    status: "busy",
    description: "Triage tickets, suggest fixes, and escalate when needed.",
    skillTags: ["Support", "Zendesk", "Empathy"],
    currentTask: "Enterprise onboarding — Acme Corp",
    performanceLabel: "94% CSAT (7d)",
    initials: "PL",
    avatarFile: "4.png",
    objective: "Resolve tier-1 issues fast with human handoff on complexity.",
    tools: ["Zendesk", "Slack", "Knowledge base"],
    installedSkills: ["Ticket triage", "Sentiment"],
    taskQueue: [
      { id: "q4", title: "Follow-up: API limits", state: "running" },
      { id: "q5", title: "Renewal risk summary", state: "queued" },
    ],
    performanceStats: [
      { label: "Tickets closed", value: "310" },
      { label: "First response", value: "8m" },
    ],
  },
  {
    id: "ag-5",
    name: "Forge",
    categoryLabel: "ENGINEERING",
    role: "Code assist",
    status: "paused",
    description: "Implements small features and fixes from approved specs.",
    skillTags: ["TypeScript", "CI", "Reviews"],
    currentTask: null,
    performanceLabel: "Paused by admin",
    initials: "FG",
    avatarFile: "5.png",
    objective: "Ship scoped PRs with tests; never merge without review gate.",
    tools: ["GitHub", "Linear", "Vercel"],
    installedSkills: ["PR template", "Test generator"],
    taskQueue: [{ id: "q6", title: "Auth refactor chunk 2", state: "blocked" }],
    performanceStats: [
      { label: "PRs merged", value: "67" },
      { label: "Revert rate", value: "2%" },
    ],
  },
  {
    id: "ag-6",
    name: "Echo",
    categoryLabel: "SALES",
    role: "Outbound sales",
    status: "active",
    description: "Personalizes outreach sequences and books meetings.",
    skillTags: ["Sequences", "LinkedIn", "Calendar"],
    currentTask: "Sequence: mid-market SaaS",
    performanceLabel: "18% reply rate",
    initials: "EC",
    avatarFile: "6.png",
    objective: "Book qualified demos without spamming; respect opt-outs.",
    tools: ["Apollo", "Cal.com", "HubSpot"],
    installedSkills: ["Personalization v2", "DNC list"],
    taskQueue: [
      { id: "q7", title: "A/B subject lines", state: "queued" },
    ],
    performanceStats: [
      { label: "Meetings booked", value: "41" },
      { label: "Emails sent", value: "2.1k" },
    ],
  },
];

export const importableSkillsMock: ImportableSkill[] = [
  {
    id: "sk-1",
    name: "Deep research",
    category: "Research",
    description: "Multi-step web research with source aggregation and summaries.",
    compatibility: "All agents",
    icon: "🔍",
  },
  {
    id: "sk-2",
    name: "CRM sync",
    category: "Integrations",
    description: "Push notes and tasks to Salesforce / HubSpot automatically.",
    compatibility: "Sales & CS agents",
    icon: "🔗",
  },
  {
    id: "sk-3",
    name: "Code review assistant",
    category: "Engineering",
    description: "Suggests security and style fixes on pull requests.",
    compatibility: "Engineering agents",
    icon: "⚙️",
  },
  {
    id: "sk-4",
    name: "Brand voice",
    category: "Content",
    description: "Enforce tone and terminology from your style guide.",
    compatibility: "Content agents",
    icon: "✍️",
  },
  {
    id: "sk-5",
    name: "Meeting scribe",
    category: "Productivity",
    description: "Live notes, action items, and recap emails post-call.",
    compatibility: "All agents",
    icon: "📝",
  },
  {
    id: "sk-6",
    name: "Compliance check",
    category: "Legal",
    description: "Flag risky language in customer-facing drafts.",
    compatibility: "Support & sales",
    icon: "⚖️",
  },
  {
    id: "sk-7",
    name: "Data viz",
    category: "Analytics",
    description: "Turn tabular exports into chart-ready summaries.",
    compatibility: "Research & ops",
    icon: "📊",
  },
  {
    id: "sk-8",
    name: "Multilingual reply",
    category: "Support",
    description: "Draft replies in 20+ languages with glossary locks.",
    compatibility: "Support agents",
    icon: "🌐",
  },
];

export const skillCategories = [
  "All",
  ...Array.from(new Set(importableSkillsMock.map((s) => s.category))),
] as const;
