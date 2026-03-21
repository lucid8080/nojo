export type AgentCreationTemplate = {
  id: string;
  label: string;
  description: string;
  role: string;
  categoryLabel: string;
  shortDescription: string;
  vibe: string;
  emoji: string;
  avatarClass: string;
  /** Suggested skill ids from `importableSkillsMock` */
  recommendedSkillIds: string[];
};

export const AGENT_CREATION_TEMPLATES: readonly AgentCreationTemplate[] = [
  {
    id: "blank",
    label: "Start blank",
    description: "Empty profile — you define everything.",
    role: "",
    categoryLabel: "SPECIALIZED",
    shortDescription: "",
    vibe: "",
    emoji: "",
    avatarClass: "bg-slate-500",
    recommendedSkillIds: [],
  },
  {
    id: "research",
    label: "Research",
    description: "Market and competitor intelligence.",
    role: "Research Analyst",
    categoryLabel: "STRATEGY",
    shortDescription:
      "Synthesizes sources into briefs the team can act on.",
    vibe: "Curious, precise, cites sources.",
    emoji: "🔎",
    avatarClass: "bg-sky-500",
    recommendedSkillIds: ["sk-1", "sk-7"],
  },
  {
    id: "support",
    label: "Support",
    description: "Triage and customer success.",
    role: "Support Specialist",
    categoryLabel: "SUPPORT",
    shortDescription: "Resolves tier-1 issues and escalates with context.",
    vibe: "Patient, clear, solution-oriented.",
    emoji: "💬",
    avatarClass: "bg-rose-500",
    recommendedSkillIds: ["sk-6", "sk-8"],
  },
  {
    id: "content",
    label: "Content",
    description: "Docs, marketing, and brand voice.",
    role: "Content Strategist",
    categoryLabel: "MARKETING",
    shortDescription: "Drafts and refines copy aligned with your style guide.",
    vibe: "Warm, concise, on-brand.",
    emoji: "✍️",
    avatarClass: "bg-violet-500",
    recommendedSkillIds: ["sk-4", "sk-1"],
  },
] as const;
