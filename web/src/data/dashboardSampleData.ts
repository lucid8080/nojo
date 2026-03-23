import type { IconName } from "@/components/dashboard/RailIcon";

export type HeaderNavItem = {
  id: string;
  label: string;
  icon: IconName;
  href?: string;
};

export const headerNavItems = [
  { id: "overview", label: "Dashboard", icon: "grid", href: "/dashboard" },
  { id: "marketplace", label: "Marketplace", icon: "grid", href: "/marketplace" },
  { id: "integrations", label: "Integrations", icon: "plus", href: "/integrations" },
  { id: "messages", label: "Chat", icon: "message", href: "/workspace" },
  { id: "team", label: "Team", icon: "users", href: "/team" },
  { id: "schedules", label: "Calendar", icon: "calendar", href: "/schedules" },
] as const;

export const topNavItems = [
  "Agent Marketplace",
  "Workflows",
  "Teams",
  "Tasks",
  "Deployments",
  "Billing",
] as const;

export const activeTopNavItem = "Workflows";

export const leftRailItems = [
  { id: "overview", label: "Main", icon: "grid", href: "/dashboard" },
  { id: "saved", label: "Saved Views", icon: "bookmark" },
  { id: "create", label: "Create", icon: "plus" },
  { id: "applications", label: "Applications", icon: "inbox" },
  {
    id: "agents",
    label: "Agents",
    icon: "users",
    href: "/team",
  },
  {
    id: "schedules",
    label: "Schedules",
    icon: "calendar",
    href: "/schedules",
  },
  {
    id: "messages",
    label: "Chat",
    icon: "message",
    href: "/workspace",
  },
  { id: "alerts", label: "Alerts", icon: "bell" },
] as const;

export const collaboratorAgents = [
  { id: "a1", initials: "RA", badge: 2, categoryLabel: "STRATEGY" },
  { id: "a2", initials: "MS", categoryLabel: "ENGINEERING" },
  { id: "a3", initials: "JL", badge: 5, categoryLabel: "SALES" },
  { id: "a4", initials: "KP", categoryLabel: "SUPPORT" },
  { id: "a5", initials: "BT", badge: 1, categoryLabel: "MARKETING" },
  { id: "a6", initials: "OZ", badge: 3, categoryLabel: "TESTING" },
  { id: "a7", initials: "CP", categoryLabel: "STRATEGY" },
  { id: "add", initials: "+", isAdd: true },
] as const;

export type WorkflowTask = {
  id: string;
  title: string;
  avatars?: string[];
  highlighted?: boolean;
  meta?: string;
};

export type WorkflowStage = {
  id: string;
  name: string;
  tasks: WorkflowTask[];
};

export const workflowStages: WorkflowStage[] = [
  {
    id: "intake",
    name: "Candidate Intake",
    tasks: [
      {
        id: "t1",
        title: "Assign request to recruiter agent",
        avatars: ["RA"],
      },
      {
        id: "t2",
        title: "Confirm hiring request received",
        avatars: ["MS", "JL"],
      },
    ],
  },
  {
    id: "analysis",
    name: "Profile Analysis",
    tasks: [
      { id: "t3", title: "Classify role requirements", avatars: ["KP"] },
      { id: "t4", title: "Score skill match", avatars: ["RA"] },
      { id: "t5", title: "Review availability and rate" },
      { id: "t6", title: "Route to specialist agent team", avatars: ["JL"] },
      {
        id: "t7",
        title: "Notify hiring lead with shortlist estimate",
        meta: "Est. 2h",
        highlighted: true,
      },
    ],
  },
  {
    id: "matching",
    name: "Agent Matching",
    tasks: [
      { id: "t8", title: "Check tool dependencies" },
      { id: "t9", title: "Validate integration readiness", avatars: ["MS"] },
      {
        id: "t10",
        title: "Estimate deployment time",
        meta: "4–6h",
        highlighted: true,
      },
      { id: "t11", title: "Share deployment estimate" },
      { id: "t12", title: "Mark candidate agent as ready", avatars: ["RA", "KP"] },
    ],
  },
];

export const nextActionTiles = [
  { id: "n1", label: "Run capability test", emphasized: false },
  { id: "n2", label: "Finalize matching", emphasized: true },
  { id: "n3", label: "Client communication", emphasized: false },
  { id: "n4", label: "Verification", emphasized: false },
  { id: "n5", label: "Send notifications", emphasized: false },
  { id: "n6", label: "Collect feedback", emphasized: false },
] as const;
