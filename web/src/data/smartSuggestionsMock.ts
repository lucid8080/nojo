import type { BoardJobId, JobStatus } from "@/data/agentJobsMock";
import { JOB_SEEDS } from "@/data/agentJobsMock";

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
  relatedJobId: BoardJobId;
  relatedJob: string;
  ctaLabel: string;
  dismissible: boolean;
  status: JobStatus;
};

type SuggestionTemplate = Omit<
  SmartSuggestion,
  "relatedJob" | "status"
>;

const SUGGESTION_TEMPLATES: readonly SuggestionTemplate[] = [
  {
    id: "s-finalize-matching",
    title: "Finalize matching",
    description:
      "Legal Intake Summary is ready for final agent-role confirmation and handoff review.",
    priority: "high",
    category: "Review",
    relatedJobId: "j6",
    ctaLabel: "Review now",
    dismissible: true,
  },
  {
    id: "s-flagged-segments",
    title: "Review flagged segments",
    description:
      "OCR and redaction checks detected possible privileged content needing verification.",
    priority: "high",
    category: "Quality Check",
    relatedJobId: "j6",
    ctaLabel: "Open log",
    dismissible: true,
  },
  {
    id: "s-verify-timeline",
    title: "Verify extracted timeline",
    description:
      "Confirm extracted party timeline points to ensure dates and events align with the exhibits.",
    priority: "medium",
    category: "Review",
    relatedJobId: "j6",
    ctaLabel: "Verify now",
    dismissible: true,
  },
  {
    id: "s-resolve-queued-automation",
    title: "Resolve queued automation",
    description:
      "CRM Workflow Automation is waiting on kickoff approval to start the next enrichment stage.",
    priority: "medium",
    category: "Automation",
    relatedJobId: "j7",
    ctaLabel: "Approve flow",
    dismissible: true,
  },
  {
    id: "s-approve-outreach-draft",
    title: "Approve outreach draft",
    description:
      "Draft Outreach Campaign has a ready-to-send first email draft (subject + compliance pass).",
    priority: "medium",
    category: "Communication",
    relatedJobId: "j8",
    ctaLabel: "Preview email",
    dismissible: true,
  },
  {
    id: "s-add-support-agent",
    title: "Add support agent",
    description:
      "Outreach workflow volume suggests adding an extra agent for faster turnaround and QA coverage.",
    priority: "low",
    category: "Staffing",
    relatedJobId: "j8",
    ctaLabel: "Assign agent",
    dismissible: true,
  },
];

function buildSuggestion(template: SuggestionTemplate): SmartSuggestion {
  const job = JOB_SEEDS[template.relatedJobId];
  return {
    ...template,
    relatedJob: job.title,
    status: job.status,
  };
}

/**
 * MOCK DATA — replace with API-driven recommendations later.
 * Derived from the currently visible board jobs so copy stays realistic.
 */
export function getSmartSuggestionsMock(): SmartSuggestion[] {
  return SUGGESTION_TEMPLATES.map(buildSuggestion);
}

