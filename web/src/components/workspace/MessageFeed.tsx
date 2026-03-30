"use client";

import { useWorkspaceAgent } from "@/components/workspace/AgentIdentityContext";
import type { WorkspaceAgent, WorkspaceMessage } from "@/data/workspaceChatMock";
import type { ReactNode, RefObject } from "react";
import { workspaceAgents } from "@/data/workspaceChatMock";
import { AgentTypingRow } from "./AgentTypingRow";
import { AgentLogCard } from "./AgentLogCard";
import { ApprovalCard } from "./ApprovalCard";
import { DeliverableCard } from "./DeliverableCard";
import { MessageBubble } from "./MessageBubble";
import { SystemMessage } from "./SystemMessage";
import { DiagramArtifactCard } from "./DiagramArtifactCard";

function staticAgent(id: string): WorkspaceAgent | undefined {
  return workspaceAgents.find((a) => a.id === id);
}

function ResolveAgent({
  id,
  children,
}: {
  id: string;
  children: (agent: WorkspaceAgent | undefined) => ReactNode;
}) {
  const merged = useWorkspaceAgent(id);
  const agent = merged ?? staticAgent(id);
  return <>{children(agent)}</>;
}

export function MessageFeed({
  messages,
  bottomAnchorRef,
  showAgentTypingRow,
  typingAgentId,
  onResolveApproval,
}: {
  messages: WorkspaceMessage[];
  bottomAnchorRef?: RefObject<HTMLDivElement | null>;
  showAgentTypingRow?: boolean;
  typingAgentId?: string;
  /** When set, approval cards can submit Approve / Request changes (workspace shell). */
  onResolveApproval?: (
    messageId: string,
    decision: "approve" | "changes",
    title: string,
  ) => void | Promise<void>;
}) {
  return (
    <div className="min-w-0 space-y-4 px-3 py-4 sm:px-5">
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
              <ResolveAgent key={m.id} id={m.agentId}>
                {(agent) => (
                  <MessageBubble
                    variant="agent"
                    body={m.body}
                    createdAt={m.createdAt}
                    agent={agent}
                    agentStatus={m.agentStatus}
                  />
                )}
              </ResolveAgent>
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
            if (!m.agentId) {
              return (
                <AgentLogCard
                  key={m.id}
                  toolName={m.toolName}
                  command={m.command}
                  outputSnippet={m.outputSnippet}
                  success={m.success}
                  createdAt={m.createdAt}
                  agent={undefined}
                />
              );
            }
            return (
              <ResolveAgent key={m.id} id={m.agentId}>
                {(agent) => (
                  <AgentLogCard
                    toolName={m.toolName}
                    command={m.command}
                    outputSnippet={m.outputSnippet}
                    success={m.success}
                    createdAt={m.createdAt}
                    agent={agent}
                  />
                )}
              </ResolveAgent>
            );
          case "deliverable":
            if (!m.agentId) {
              return (
                <DeliverableCard
                  key={m.id}
                  fileName={m.fileName}
                  fileType={m.fileType}
                  version={m.version}
                  createdAt={m.createdAt}
                  agent={undefined}
                />
              );
            }
            return (
              <ResolveAgent key={m.id} id={m.agentId}>
                {(agent) => (
                  <DeliverableCard
                    fileName={m.fileName}
                    fileType={m.fileType}
                    version={m.version}
                    createdAt={m.createdAt}
                    agent={agent}
                  />
                )}
              </ResolveAgent>
            );
          case "approval":
            return (
              <ResolveAgent key={m.id} id={m.requesterAgentId}>
                {(agent) => (
                  <ApprovalCard
                    title={m.title}
                    description={m.description}
                    requester={agent}
                    createdAt={m.createdAt}
                    status={m.status ?? "pending"}
                    decidedAtLabel={m.decidedAtLabel}
                    onApprove={
                      (m.status ?? "pending") === "pending" && onResolveApproval
                        ? () => {
                            void onResolveApproval(m.id, "approve", m.title);
                          }
                        : undefined
                    }
                    onRequestChanges={
                      (m.status ?? "pending") === "pending" && onResolveApproval
                        ? () => {
                            void onResolveApproval(m.id, "changes", m.title);
                          }
                        : undefined
                    }
                  />
                )}
              </ResolveAgent>
            );
          case "artifact":
            if (m.artifactType === "diagram.excalidraw") {
              if (!m.agentId) {
                return (
                  <DiagramArtifactCard
                    key={m.id}
                    title={m.title}
                    createdAt={m.createdAt}
                    files={m.files}
                    agent={undefined}
                  />
                );
              }
              return (
                <ResolveAgent key={m.id} id={m.agentId}>
                  {(agent) => (
                    <DiagramArtifactCard
                      title={m.title}
                      createdAt={m.createdAt}
                      files={m.files}
                      agent={agent}
                    />
                  )}
                </ResolveAgent>
              );
            }
            return null;
          default:
            return null;
        }
      })}
      {showAgentTypingRow && typingAgentId ? (
        <AgentTypingRow agentId={typingAgentId} />
      ) : null}
      <div ref={bottomAnchorRef} className="h-px w-full shrink-0 scroll-mt-4" aria-hidden />
    </div>
  );
}
