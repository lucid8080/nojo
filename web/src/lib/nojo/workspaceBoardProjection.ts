/**
 * Projects Agent Workspace conversation data into dashboard Job board DTOs (`Job`).
 * Single mapping path shared with workspace seed data in `workspaceChatMock.ts`.
 */

import type { Job, JobFooter, JobPriority, JobStatus, TaskLogEntry } from "@/data/agentJobsMock";
import type {
  Conversation,
  JobContext,
  WorkspaceMessage,
  WorkspaceStatus,
} from "@/data/workspaceChatMock";

/** Matches GET /api/openclaw/runs row shape used by the dashboard. */
export type WorkspaceBoardRunRow = {
  id: string;
  prompt: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  conversationId: string | null;
};

const TERMINAL_RUN_STATUSES = new Set([
  "completed",
  "succeeded",
  "failed",
  "cancelled",
  "canceled",
  "error",
]);

export function mapWorkspaceStatusToJobStatus(status: WorkspaceStatus): JobStatus {
  switch (status) {
    case "Thinking":
      return "Analyzing";
    case "Working":
      return "In Progress";
    case "Waiting for Reply":
      return "Reviewing";
    case "Completed":
      return "Completed";
    default:
      return "In Progress";
  }
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatRunRelative(createdAtIso: string): string {
  const d = new Date(createdAtIso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = Date.now();
  const sec = Math.floor((now - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function runStatusToTaskState(
  status: string,
): "done" | "running" | "queued" | "blocked" {
  const s = status.toLowerCase().trim();
  if (TERMINAL_RUN_STATUSES.has(s)) {
    if (s === "failed" || s === "error" || s === "cancelled" || s === "canceled") {
      return "blocked";
    }
    return "done";
  }
  return "running";
}

function derivePriority(c: Conversation): JobPriority {
  if (c.status === "Completed") return "Low";
  if (c.unreadCount >= 3) return "High";
  return "Medium";
}

function derivePhase(ctx: JobContext | null): string {
  if (!ctx?.subtasks?.length) return "—";
  const done = ctx.subtasks.filter((s) => s.done).length;
  const total = ctx.subtasks.length;
  return `${done}/${total} subtasks`;
}

function buildFooter(ctx: JobContext | null): JobFooter {
  if (!ctx) {
    return {
      eta: "—",
      tokensTools: "—",
      phase: "—",
      completionPct: 0,
    };
  }
  return {
    eta: ctx.dueDate?.trim() ? ctx.dueDate : "—",
    tokensTools: "—",
    phase: derivePhase(ctx),
    completionPct: Math.min(100, Math.max(0, ctx.progressPercent)),
  };
}

function messageToTask(
  conversationId: string,
  m: WorkspaceMessage,
  resolveAgentName: (agentId: string) => string,
  index: number,
): TaskLogEntry {
  const baseTime = m.createdAt || "—";
  const id = `${conversationId}-msg-${m.id}-${index}`;

  switch (m.type) {
    case "user":
      return {
        id,
        text: truncate(m.body, 140),
        agentName: "You",
        state: "done",
        time: baseTime,
        actorKind: "system",
      };
    case "agent":
      return {
        id,
        text: truncate(m.body, 140),
        agentName: resolveAgentName(m.agentId),
        state: "done",
        time: baseTime,
        actorKind: "agent",
        participantId: m.agentId,
      };
    case "system":
      return {
        id,
        text: truncate(m.body, 140),
        agentName: "System",
        state: "done",
        time: baseTime,
        actorKind: "system",
      };
    case "tool_log":
      return m.agentId
        ? {
            id,
            text: truncate(`${m.toolName}: ${m.outputSnippet}`, 140),
            agentName: resolveAgentName(m.agentId),
            state: m.success ? "done" : "blocked",
            time: baseTime,
            actorKind: "agent",
            participantId: m.agentId,
          }
        : {
            id,
            text: truncate(`${m.toolName}: ${m.outputSnippet}`, 140),
            agentName: "Tool",
            state: m.success ? "done" : "blocked",
            time: baseTime,
            actorKind: "system",
          };
    case "deliverable":
      return m.agentId
        ? {
            id,
            text: truncate(`Deliverable · ${m.fileName} (${m.fileType})`, 140),
            agentName: resolveAgentName(m.agentId),
            state: "done",
            time: baseTime,
            actorKind: "agent",
            participantId: m.agentId,
          }
        : {
            id,
            text: truncate(`Deliverable · ${m.fileName} (${m.fileType})`, 140),
            agentName: "Agent",
            state: "done",
            time: baseTime,
            actorKind: "system",
          };
    case "approval":
      return {
        id,
        text: truncate(`Approval · ${m.title}`, 140),
        agentName: resolveAgentName(m.requesterAgentId),
        state: "queued",
        time: baseTime,
        highlight: "milestone",
        actorKind: "agent",
        participantId: m.requesterAgentId,
      };
    default:
      return {
        id,
        text: "Message",
        agentName: "Workspace",
        state: "done",
        time: baseTime,
        actorKind: "system",
      };
  }
}

function buildSubtitle(c: Conversation, ctx: JobContext | null): string {
  if (ctx?.description?.trim()) return truncate(ctx.description.trim(), 120);
  if (c.lastPreview?.trim()) return truncate(c.lastPreview.trim(), 120);
  return "—";
}

/**
 * Build execution log lines: activity, subtasks, recent messages, OpenClaw runs.
 * Order: activity (chronological), subtasks, last message slice, runs (oldest first).
 */
export function buildWorkspaceBoardTasks(
  conversationId: string,
  ctx: JobContext | null,
  messages: WorkspaceMessage[],
  runs: WorkspaceBoardRunRow[],
  resolveAgentName: (agentId: string) => string,
): TaskLogEntry[] {
  const tasks: TaskLogEntry[] = [];

  if (ctx?.activity?.length) {
    for (const a of ctx.activity) {
      tasks.push({
        id: `${conversationId}-act-${a.id}`,
        text: a.label,
        agentName: "Timeline",
        state: "done",
        time: a.time,
        highlight: a.tone === "warning" ? "blocked" : undefined,
        actorKind: "system",
      });
    }
  }

  if (ctx?.subtasks?.length) {
    for (const st of ctx.subtasks) {
      const hasAssignee = Boolean(st.assigneeAgentId?.trim());
      const assignee = hasAssignee
        ? resolveAgentName(st.assigneeAgentId!)
        : "Unassigned";
      tasks.push({
        id: `${conversationId}-st-${st.id}`,
        text: st.title,
        agentName: assignee,
        state: st.done ? "done" : "queued",
        time: st.done ? "done" : "open",
        actorKind: hasAssignee ? "agent" : "system",
        ...(hasAssignee ? { participantId: st.assigneeAgentId! } : {}),
      });
    }
  }

  const tail = messages.slice(-6);
  tail.forEach((m, i) => {
    tasks.push(messageToTask(conversationId, m, resolveAgentName, i));
  });

  const sortedRuns = [...runs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  for (const r of sortedRuns.slice(-5)) {
    const st = runStatusToTaskState(r.status);
    const line = truncate(r.prompt, 120);
    const err = r.errorMessage?.trim();
    tasks.push({
      id: `${conversationId}-run-${r.id}`,
      text: err ? `${line} · ${truncate(err, 60)}` : line,
      agentName: "OpenClaw run",
      state: st,
      time: formatRunRelative(r.createdAt),
      highlight: st === "running" ? "running" : undefined,
      actorKind: "run",
    });
  }

  return tasks;
}

export type ProjectWorkspaceJobOptions = {
  jobContext: JobContext | null;
  messages: WorkspaceMessage[];
  runsForConversation: WorkspaceBoardRunRow[];
  resolveAgentName: (agentId: string) => string;
};

/**
 * Map a workspace `Conversation` (+ context, messages, runs) to a dashboard `Job`.
 * `conversation.id` becomes `Job.id` (e.g. c1).
 */
export function projectWorkspaceConversationToJob(
  conversation: Conversation,
  opts: ProjectWorkspaceJobOptions,
): Job {
  const { jobContext, messages, runsForConversation, resolveAgentName } = opts;
  const ctx = jobContext;
  const title =
    conversation.jobTitle?.trim() ||
    ctx?.title?.trim() ||
    "Untitled thread";

  const agentIds = conversation.agents.map((a) => a.id);
  const agents = conversation.agents.map((a) => resolveAgentName(a.id));

  const tasks = buildWorkspaceBoardTasks(
    conversation.id,
    ctx,
    messages,
    runsForConversation,
    resolveAgentName,
  );

  return {
    id: conversation.id,
    title,
    client: buildSubtitle(conversation, ctx),
    status: mapWorkspaceStatusToJobStatus(conversation.status),
    priority: derivePriority(conversation),
    agents,
    agentIds,
    primaryAgentId: conversation.primaryAgentId,
    primaryAgentName: resolveAgentName(conversation.primaryAgentId),
    startedAgo: conversation.timestamp,
    tasks,
    footer: buildFooter(ctx),
  };
}
