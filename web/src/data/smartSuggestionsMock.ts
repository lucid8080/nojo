import type { JobStatus } from "@/data/agentJobsMock";
import { getConversation } from "@/data/workspaceChatMock";
import { mapWorkspaceStatusToJobStatus } from "@/lib/nojo/workspaceBoardProjection";

export type SmartSuggestionPriority = "high" | "medium" | "low";

export type SmartSuggestionCategory =
  | "Review"
  | "Automation"
  | "Communication"
  | "Staffing"
  | "Quality Check"
  | "Escalation";

export type SmartSuggestion = {
  id: string;
  title: string;
  description: string;
  priority: SmartSuggestionPriority;
  category: SmartSuggestionCategory;
  /** Agent Workspace conversation id (same as work board cards). */
  relatedConversationId: string;
  /** Thread title for display. */
  relatedThread: string;
  ctaLabel: string;
  dismissible: boolean;
  status: JobStatus;
};

type SuggestionTemplate = Omit<
  SmartSuggestion,
  "relatedThread" | "status"
>;

const SUGGESTION_TEMPLATES: readonly SuggestionTemplate[] = [
  {
    id: "s-finalize-matching",
    title: "Finalize publish",
    description:
      "Q2 Enterprise positioning refresh is waiting on approval to publish v1.1 to the shared drive.",
    priority: "high",
    category: "Review",
    relatedConversationId: "c1",
    ctaLabel: "Review now",
    dismissible: true,
  },
  {
    id: "s-flagged-segments",
    title: "Review compliance flags",
    description:
      "Mira flagged a superlative in the enterprise copy — confirm citation or soften the claim.",
    priority: "high",
    category: "Quality Check",
    relatedConversationId: "c1",
    ctaLabel: "Open log",
    dismissible: true,
  },
  {
    id: "s-verify-timeline",
    title: "Confirm hiring brief scope",
    description:
      "Agent hiring brief for the SDR bot still needs Spanish coverage confirmed before drafting.",
    priority: "medium",
    category: "Review",
    relatedConversationId: "c4",
    ctaLabel: "Verify now",
    dismissible: true,
  },
  {
    id: "s-resolve-queued-automation",
    title: "Unblock pipeline digest",
    description:
      "Pipeline health weekly digest is merging warehouse + CRM metrics — watch for stage merge errors.",
    priority: "medium",
    category: "Automation",
    relatedConversationId: "c2",
    ctaLabel: "Open thread",
    dismissible: true,
  },
  {
    id: "s-approve-outreach-draft",
    title: "Pick onboarding subjects",
    description:
      "Onboarding email sequence v3 has two subject-line options ready for your decision.",
    priority: "medium",
    category: "Communication",
    relatedConversationId: "c7",
    ctaLabel: "Choose subject",
    dismissible: true,
  },
  {
    id: "s-add-support-agent",
    title: "Review support escalations",
    description:
      "Support inbox triage shows several threads that may need human follow-up today.",
    priority: "low",
    category: "Staffing",
    relatedConversationId: "c3",
    ctaLabel: "Open inbox",
    dismissible: true,
  },
];

function buildSuggestion(template: SuggestionTemplate): SmartSuggestion {
  const c = getConversation(template.relatedConversationId);
  const relatedThread = c?.jobTitle?.trim() || template.relatedConversationId;
  const status: JobStatus = c
    ? mapWorkspaceStatusToJobStatus(c.status)
    : "In Progress";
  return {
    ...template,
    relatedThread,
    status,
  };
}

/**
 * MOCK DATA — replace with API-driven recommendations later.
 * Titles and status are derived from the same workspace seed as the inbox and work board.
 */
export function getSmartSuggestionsMock(): SmartSuggestion[] {
  return SUGGESTION_TEMPLATES.map(buildSuggestion);
}
