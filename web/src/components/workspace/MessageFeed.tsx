"use client";

import type { WorkspaceMessage } from "@/data/workspaceChatMock";
import { workspaceAgents } from "@/data/workspaceChatMock";
import { AgentLogCard } from "./AgentLogCard";
import { ApprovalCard } from "./ApprovalCard";
import { DeliverableCard } from "./DeliverableCard";
import { MessageBubble } from "./MessageBubble";
import { SystemMessage } from "./SystemMessage";

function agent(id: string) {
  return workspaceAgents.find((a) => a.id === id);
}

export function MessageFeed({ messages }: { messages: WorkspaceMessage[] }) {
  return (
    <div className="space-y-4 px-3 py-4 sm:px-5">
      {messages.map((m) => {
        switch (m.type) {
          case "user":
            return (
              <MessageBubble
                key={m.id}
                variant="user"
                body={m.body}
                createdAt={m.createdAt}
              />
            );
          case "agent":
            return (
              <MessageBubble
                key={m.id}
                variant="agent"
                body={m.body}
                createdAt={m.createdAt}
                agent={agent(m.agentId)}
                agentStatus={m.agentStatus}
              />
            );
          case "system":
            return (
              <SystemMessage
                key={m.id}
                body={m.body}
                createdAt={m.createdAt}
                runId={m.runId}
                initialRunStatus={m.runStatus}
              />
            );
          case "tool_log":
            return (
              <AgentLogCard
                key={m.id}
                toolName={m.toolName}
                command={m.command}
                outputSnippet={m.outputSnippet}
                success={m.success}
                createdAt={m.createdAt}
                agent={m.agentId ? agent(m.agentId) : undefined}
              />
            );
          case "deliverable":
            return (
              <DeliverableCard
                key={m.id}
                fileName={m.fileName}
                fileType={m.fileType}
                version={m.version}
                createdAt={m.createdAt}
                agent={m.agentId ? agent(m.agentId) : undefined}
              />
            );
          case "approval":
            return (
              <ApprovalCard
                key={m.id}
                title={m.title}
                description={m.description}
                requester={agent(m.requesterAgentId)}
                createdAt={m.createdAt}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
