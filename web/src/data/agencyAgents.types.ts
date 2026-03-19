export type AgencyAgent = {
  id: string;
  division: string;
  categoryLabel: string;
  title: string;
  description: string;
  githubUrl: string;
};

export type AgencyAgentsPayload = {
  generatedAt: string;
  source: string;
  agents: AgencyAgent[];
};
