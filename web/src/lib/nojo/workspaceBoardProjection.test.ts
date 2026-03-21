import { describe, expect, it } from "vitest";
import {
  buildWorkspaceBoardTasks,
  mapWorkspaceStatusToJobStatus,
  projectWorkspaceConversationToJob,
} from "./workspaceBoardProjection";
import {
  getConversation,
  getJobContextForConversation,
  getMessagesForConversation,
} from "@/data/workspaceChatMock";

function resolveName(id: string): string {
  return id === "nojo-content" ? "Nova" : id;
}

describe("mapWorkspaceStatusToJobStatus", () => {
  it("maps workspace statuses to job statuses", () => {
    expect(mapWorkspaceStatusToJobStatus("Thinking")).toBe("Analyzing");
    expect(mapWorkspaceStatusToJobStatus("Working")).toBe("In Progress");
    expect(mapWorkspaceStatusToJobStatus("Waiting for Reply")).toBe("Reviewing");
    expect(mapWorkspaceStatusToJobStatus("Completed")).toBe("Completed");
  });
});

describe("projectWorkspaceConversationToJob", () => {
  it("builds a job from c1 with full context", () => {
    const c = getConversation("c1");
    expect(c).toBeDefined();
    const ctx = getJobContextForConversation("c1");
    const messages = getMessagesForConversation("c1");
    const job = projectWorkspaceConversationToJob(c!, {
      jobContext: ctx,
      messages,
      runsForConversation: [],
      resolveAgentName: resolveName,
    });
    expect(job.id).toBe("c1");
    expect(job.title).toBe("Q2 Enterprise positioning refresh");
    expect(job.footer.completionPct).toBe(78);
    expect(job.agents.length).toBeGreaterThan(0);
    expect(job.agentIds).toEqual(["nojo-content", "nojo-sales", "nojo-main"]);
    expect(job.agents).toEqual(["Nova", "nojo-sales", "nojo-main"]);
    expect(job.primaryAgentId).toBe("nojo-content");
    expect(job.primaryAgentName).toBe("Nova");
    expect(job.tasks.length).toBeGreaterThan(0);
  });

  it("degrades when job context is missing", () => {
    const c = getConversation("c1")!;
    const job = projectWorkspaceConversationToJob(c, {
      jobContext: null,
      messages: [],
      runsForConversation: [],
      resolveAgentName: resolveName,
    });
    expect(job.footer.completionPct).toBe(0);
    expect(job.footer.eta).toBe("—");
    expect(job.tasks.length).toBe(0);
  });
});

describe("buildWorkspaceBoardTasks", () => {
  it("marks activity rows as system timeline not misleading person initials", () => {
    const ctx = getJobContextForConversation("c1");
    const tasks = buildWorkspaceBoardTasks("c1", ctx, [], [], resolveName);
    const act = tasks.find((t) => t.id.includes("-act-"));
    expect(act?.actorKind).toBe("system");
    expect(act?.agentName).toBe("Timeline");
  });

  it("appends OpenClaw run rows", () => {
    const ctx = getJobContextForConversation("c1");
    const runs = [
      {
        id: "run-1",
        prompt: "Hello world task",
        status: "running",
        errorMessage: null,
        createdAt: new Date().toISOString(),
        conversationId: "c1",
      },
    ];
    const tasks = buildWorkspaceBoardTasks(
      "c1",
      ctx,
      [],
      runs,
      resolveName,
    );
    const runLine = tasks.find((t) => t.id.includes("run-run-1"));
    expect(runLine).toBeDefined();
    expect(runLine?.agentName).toBe("OpenClaw run");
    expect(runLine?.actorKind).toBe("run");
  });
});
