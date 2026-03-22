export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/agents", label: "Agents" },
  { href: "/admin/conversations", label: "Conversations" },
  { href: "/admin/runs", label: "Runs" },
  { href: "/admin/schedules", label: "Schedules" },
  { href: "/admin/system", label: "System" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/skill-cards", label: "Skill cards" },
  { href: "/admin/settings", label: "Settings" },
] as const;
