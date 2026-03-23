import { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { getOpenClawRoomBridge, type OpenClawChatBridgeEvent } from "@/lib/openclaw/openclaw-chat-bridge";
import { persistAgentArtifact } from "@/lib/files/persistAgentArtifact";
import {
  buildNovaContentQaPayload,
  ensureNojoAgentIdentityScaffold,
} from "@/lib/nojo/ensureNojoAgentIdentityScaffold";
import { ensureUserWorkspaceAgentIdentityScaffold } from "@/lib/nojo/ensureUserWorkspaceAgentIdentityScaffold";
import { canonicalizeAgentId } from "@/lib/nojo/agentIdCanonicalization";
import { isUserCreatedWorkspaceAgentId } from "@/lib/workspace/userWorkspaceAgentServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ success: false, message: "Unauthorized." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const conversationId = req.nextUrl.searchParams.get("conversationId")?.trim() ?? "";
  if (!conversationId) {
    return new Response(JSON.stringify({ success: false, message: "conversationId is required." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const requestedAgentId = req.nextUrl.searchParams.get("agentId")?.trim() ?? "";
  if (!requestedAgentId) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "agentId is required. Nojo chat stream requires an explicit project agent id (e.g. nojo-main).",
      }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const canonical = canonicalizeAgentId(requestedAgentId);
  const agentId = canonical.effectiveAgentId;
  const canonicalScaffold = await ensureNojoAgentIdentityScaffold({ agentId });
  const teamScaffold = isUserCreatedWorkspaceAgentId(agentId)
    ? await ensureUserWorkspaceAgentIdentityScaffold({ userId, agentId })
    : null;
  const scaffold =
    isUserCreatedWorkspaceAgentId(agentId) && teamScaffold?.runtimeWorkspaceAbsPath
      ? teamScaffold
      : canonicalScaffold;
  const novaContentQa =
    agentId === "nojo-content" ? buildNovaContentQaPayload(scaffold) : undefined;

  console.info("[openclaw-qa][stream.identity]", {
    requestedAgentId: canonical.requestedAgentId,
    effectiveAgentId: canonical.effectiveAgentId,
    matchedNojoAgent: canonical.matchedNojoAgent,
    matchedLegacyAlias: canonical.matchedLegacyAlias,
    legacyAliasUsed: canonical.legacyAliasUsed,
    identityScaffoldChecked: true,
    identityScaffoldSeeded: scaffold.seeded,
    identityScaffoldSeedFiles: scaffold.seededFiles,
    identityScaffoldAgentId: agentId,
    scaffoldSkippedBecauseFilesExist: scaffold.scaffoldSkippedBecauseFilesExist,
    identityScaffoldRuntimeWorkspace: scaffold.runtimeWorkspaceAbsPath,
    identityScaffoldConfiguredAgentsRoot: scaffold.configuredAgentsRoot,
    identityScaffoldTemplateRootResolved: scaffold.templateRootResolved,
    identityScaffoldFileReports: scaffold.fileReports,
    identityScaffoldRuntimeFileSnapshot: scaffold.runtimeFileSnapshot,
    identityScaffoldRuntimeIdentityFingerprint: scaffold.runtimeIdentityFingerprint,
    identityScaffoldGenericFallbackRisk: scaffold.genericFallbackRisk,
    preExistingNonEmptyFiles: scaffold.preExistingNonEmptyFiles,
    ...(novaContentQa ? { novaContentQa } : {}),
  });

  const bridge = getOpenClawRoomBridge({ userId, conversationId, agentId });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (ev: OpenClawChatBridgeEvent) => {
        try {
          if (ev.type === "artifacts") {
            void persistAndEmitArtifacts(ev);
          } else {
            controller.enqueue(encoder.encode(sseLine("openclaw", ev)));
          }
        } catch {
          // closed
        }
      };

      const resolveProjectIdForArtifact = async (): Promise<string> => {
        // Prefer conversation-linked project if available.
        const conversationRow = await prisma.workspaceConversation.findFirst({
          where: { id: conversationId, userId },
          select: { projectId: true, title: true, description: true },
        });

        if (conversationRow?.projectId) return conversationRow.projectId;

        const titleLower = `${conversationRow?.title ?? ""} ${conversationRow?.description ?? ""}`.toLowerCase();
        const agentLower = agentId.toLowerCase();
        const hintLower = `${titleLower} ${agentLower}`;

        const defaultName =
          hintLower.includes("resume") || hintLower.includes("cv")
            ? "Resume Drafts"
            : hintLower.includes("job") || hintLower.includes("hunt")
              ? "Job Hunt Drafts"
              : "Chat Files";

        const existing = await prisma.project.findFirst({
          where: { ownerUserId: userId, name: defaultName },
          select: { id: true },
        });
        if (existing) return existing.id;

        const created = await prisma.project.create({
          data: {
            ownerUserId: userId,
            name: defaultName,
            description: null,
          },
          select: { id: true },
        });

        if (conversationRow && !conversationRow.projectId) {
          await prisma.workspaceConversation.updateMany({
            where: { id: conversationId, userId },
            data: { projectId: created.id },
          });
        }

        return created.id;
      };

      const persistAndEmitArtifacts = async (
        ev: Extract<OpenClawChatBridgeEvent, { type: "artifacts" }>,
      ) => {
        const projectIdResolved = await resolveProjectIdForArtifact();

        const runtimeWorkspaceAbsPath = scaffold.runtimeWorkspaceAbsPath ?? "";

        for (const artifact of ev.artifacts) {
          try {
            const result = (() => {
              if (artifact.bytesBase64) {
                const bytes = Buffer.from(artifact.bytesBase64, "base64");
                return persistAgentArtifact({
                  userId,
                  projectId: projectIdResolved,
                  filename: artifact.filename,
                  bytes,
                  changeSummary: null,
                  createdByType: "agent",
                  createdByAgentId: ev.createdByAgentId ?? null,
                });
              }

              if (artifact.contentText) {
                const bytes = Buffer.from(artifact.contentText, "utf8");
                return persistAgentArtifact({
                  userId,
                  projectId: projectIdResolved,
                  filename: artifact.filename,
                  bytes,
                  changeSummary: null,
                  createdByType: "agent",
                  createdByAgentId: ev.createdByAgentId ?? null,
                });
              }

              if (artifact.tempPath) {
                return persistAgentArtifact({
                  userId,
                  projectId: projectIdResolved,
                  filename: artifact.filename,
                  tempPath: artifact.tempPath,
                  runtimeWorkspaceAbsPath,
                  changeSummary: null,
                  createdByType: "agent",
                  createdByAgentId: ev.createdByAgentId ?? null,
                });
              }

              return null;
            })();

            if (!result) continue;

            controller.enqueue(
              encoder.encode(
                sseLine("artifact_persisted", {
                  fileId: result.file.id,
                  projectId: result.file.projectId,
                  filename: result.file.filename,
                  mimeType: result.file.mimeType,
                  extension: result.file.extension,
                  sizeBytes: result.file.sizeBytes,
                  revisionVersionNumber: result.file.currentRevision?.versionNumber,
                  updatedAt: result.file.updatedAt,
                }),
              ),
            );
          } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to persist artifact.";
            console.error("[openclaw][artifact_persisted][persist]", { message, artifact });
            // Keep the stream going; client will still see chat deltas/final.
            try {
              controller.enqueue(
                encoder.encode(
                  sseLine("openclaw", {
                    type: "status",
                    phase: "artifact_persist_failed",
                    detail: message,
                  }),
                ),
              );
            } catch {
              // closed
            }
          }
        }
      };

      try {
        controller.enqueue(
          encoder.encode(
            sseLine("openclaw", {
              type: "status",
              phase: "identity_scaffold",
              // TEMP(QA): remove after runtime scaffold verification signoff.
              requestedAgentId: canonical.requestedAgentId,
              effectiveAgentId: canonical.effectiveAgentId,
              matchedNojoAgent: canonical.matchedNojoAgent,
              matchedLegacyAlias: canonical.matchedLegacyAlias,
              legacyAliasUsed: canonical.legacyAliasUsed,
              identityScaffoldChecked: true,
              identityScaffoldSeeded: scaffold.seeded,
              identityScaffoldSeedFiles: scaffold.seededFiles,
              identityScaffoldAgentId: agentId,
              scaffoldSkippedBecauseFilesExist: scaffold.scaffoldSkippedBecauseFilesExist,
              identityScaffoldRuntimeWorkspace: scaffold.runtimeWorkspaceAbsPath,
              identityScaffoldConfiguredAgentsRoot: scaffold.configuredAgentsRoot,
              identityScaffoldTemplateRootResolved: scaffold.templateRootResolved,
              identityScaffoldFileReports: scaffold.fileReports,
              identityScaffoldRuntimeFileSnapshot: scaffold.runtimeFileSnapshot,
              identityScaffoldRuntimeIdentityFingerprint: scaffold.runtimeIdentityFingerprint,
              identityScaffoldGenericFallbackRisk: scaffold.genericFallbackRisk,
              preExistingNonEmptyFiles: scaffold.preExistingNonEmptyFiles,
              ...(novaContentQa ? { novaContentQa } : {}),
            }),
          ),
        );
      } catch {
        // closed
      }

      unsubscribe = bridge.subscribe(push);

      const onAbort = () => {
        try {
          unsubscribe?.();
        } finally {
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      req.signal.addEventListener("abort", onAbort);
    },
    cancel() {
      try {
        unsubscribe?.();
      } finally {
        unsubscribe = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
