/** Serializable YAML frontmatter from agency-agents repo (varies per file). */
export type AgencyAgentFrontmatter = Record<string, unknown>;

export type AgencyAgent = {
  id: string;
  /** Path to bundled file under agency-agents-bundled/ (same as id). */
  localContentPath: string;
  division: string;
  categoryLabel: string;
  title: string;
  description: string;
  githubUrl: string;
  /** Git blob SHA from tree API when available. */
  contentSha: string | null;
  frontmatter: AgencyAgentFrontmatter;
};

export type AgencyAgentsPayload = {
  generatedAt: string;
  source: string;
  branch: string;
  /** Tip commit SHA for branch at sync time (optional). */
  repoCommitSha?: string;
  agents: AgencyAgent[];
};
