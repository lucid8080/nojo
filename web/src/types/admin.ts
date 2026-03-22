import type { SkillCardSourceType, SkillCardStatus, UserRole } from "@prisma/client";

export type AdminOverviewStats = {
  totalUsers: number;
  totalAgents: number;
  totalConversations: number;
  totalRuns: number;
  runsInProgress: number;
  runsFailed: number;
  openClawHealth: {
    ok: boolean;
    status?: number;
    endpoint?: string;
    message?: string;
    code?: string;
  };
  cronJobsCount: number | null;
  cronJobsAvailable: boolean;
};

export type AdminUserListRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  counts: {
    agents: number;
    conversations: number;
    runs: number;
  };
};

export type AdminAgentListRow = {
  id: string;
  agentId: string;
  name: string;
  categoryLabel: string | null;
  createdAt: string;
  owner: { id: string; email: string };
  conversationCount: number;
  runCount: number;
};

export type AdminConversationListRow = {
  id: string;
  title: string;
  createdAt: string;
  owner: { id: string; email: string };
  primaryAgentId: string;
  agentCount: number;
};

export type AdminRunListRow = {
  id: string;
  openclawRunId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt: string | null;
  promptPreview: string;
  errorPreview: string | null;
  user: { id: string; email: string };
  agentId: string | null;
  conversationId: string | null;
};

export type AdminSkillCardListRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  status: SkillCardStatus;
  sourceType: SkillCardSourceType | null;
  sourcePath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminSkillCardDetail = AdminSkillCardListRow & {
  fullDefinitionMarkdown: string;
};

export type AdminSystemSnapshot = {
  database: { ok: boolean; message?: string };
  nextAuth: { secretConfigured: boolean };
  openClaw: {
    baseUrlConfigured: boolean;
    gatewayTokenPresent: boolean;
    hooksTokenPresent: boolean;
    timeoutMs: number | null;
    loadError: string | null;
  };
  openClawHealth: AdminOverviewStats["openClawHealth"];
  environment: {
    nodeEnv: string | undefined;
  };
  recommendations: string[];
};
