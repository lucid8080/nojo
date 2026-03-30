import { NextRequest } from "next/server";
import { promises as fsp } from "node:fs";

import { getSessionUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { getOpenClawRoomBridge, type OpenClawChatBridgeEvent } from "@/lib/openclaw/openclaw-chat-bridge";
import { persistAgentArtifact, resolveSafeTempArtifactAbsPath } from "@/lib/files/persistAgentArtifact";
import {
  buildNovaContentQaPayload,
  ensureNojoAgentIdentityScaffold,
} from "@/lib/nojo/ensureNojoAgentIdentityScaffold";
import { ensureUserWorkspaceAgentIdentityScaffold } from "@/lib/nojo/ensureUserWorkspaceAgentIdentityScaffold";
import { canonicalizeAgentId } from "@/lib/nojo/agentIdCanonicalization";
import { isUserCreatedWorkspaceAgentId } from "@/lib/workspace/userWorkspaceAgentServer";
import { createDiagramArtifact } from "@/lib/diagram/excalidraw/storage";
import { renderExcalidrawToSvg } from "@/lib/diagram/excalidraw/render";
import { createServerDiagramFallbackArtifact } from "@/lib/diagram/excalidraw/serverDiagramFallback";
import { shouldOfferServerDiagramFallback } from "@/lib/nojo/diagramIntent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function runKeyOf(runId: string | undefined): string {
  return runId && runId.trim().length > 0 ? runId.trim() : "no_run_id";
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
      const runArtifactChain = new Map<string, Promise<void>>();
      const excalidrawPersistedByRun = new Set<string>();
      const diagramFallbackDoneByRun = new Set<string>();

      const appendRunWork = (runId: string | undefined, fn: () => Promise<void>): void => {
        const key = runKeyOf(runId);
        const prev = runArtifactChain.get(key) ?? Promise.resolve();
        const next = prev.then(fn).catch((err) => {
          console.error("[openclaw][stream.runQueue]", key, err);
        });
        runArtifactChain.set(key, next);
      };

      const resolveProjectIdForArtifact = async (): Promise<string> => {
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

      const maybeRunDiagramFallback = async (runId: string | undefined) => {
        const rk = runKeyOf(runId);
        const userPrompt = bridge.getLastUserPromptForArtifacts();
        if (
          !shouldOfferServerDiagramFallback({
            userPrompt,
            excalidrawPersistedForRun: excalidrawPersistedByRun.has(rk),
            fallbackAlreadyRan: diagramFallbackDoneByRun.has(rk),
          })
        ) {
          return;
        }
        diagramFallbackDoneByRun.add(rk);
        try {
          const projectIdResolved = await resolveProjectIdForArtifact();
          const dbArtifact = await createServerDiagramFallbackArtifact({
            userId,
            workspaceId: projectIdResolved,
            agentId,
            userPrompt,
          });
          controller.enqueue(
            encoder.encode(
              sseLine("diagram_artifact_created", {
                artifactType: "diagram.excalidraw",
                title: dbArtifact.title,
                files: dbArtifact.files,
                agentId: dbArtifact.agentId,
              }),
            ),
          );
        } catch (err) {
          console.error("[openclaw][diagram_fallback_failed]", err);
        }
      };

      const persistAndEmitArtifacts = async (
        ev: Extract<OpenClawChatBridgeEvent, { type: "artifacts" }>,
      ) => {
        const rk = runKeyOf(ev.runId);
        const projectIdResolved = await resolveProjectIdForArtifact();
        const runtimeWorkspaceAbsPath = scaffold.runtimeWorkspaceAbsPath ?? "";

        for (const artifact of ev.artifacts) {
          try {
            if (artifact.filename && artifact.filename.endsWith(".excalidraw")) {
              let contentText: string | null =
                typeof artifact.contentText === "string" && artifact.contentText.length > 0
                  ? artifact.contentText
                  : null;
              if (!contentText && artifact.bytesBase64) {
                contentText = Buffer.from(artifact.bytesBase64, "base64").toString("utf8");
              }
              if (!contentText && artifact.tempPath && runtimeWorkspaceAbsPath) {
                try {
                  const abs = resolveSafeTempArtifactAbsPath({
                    runtimeWorkspaceAbsPath,
                    tempPath: artifact.tempPath,
                  });
                  contentText = await fsp.readFile(abs, "utf8");
                } catch (readErr) {
                  console.error("[openclaw][excalidraw_tempPath_read_failed]", readErr);
                }
              }
              if (contentText) {
                try {
                  let diagramObj: unknown;
                  try {
                    diagramObj = JSON.parse(contentText);
                  } catch {
                    diagramObj = { type: "excalidraw", version: 2, source: "fallback", elements: [] };
                  }
                  const svgStr = renderExcalidrawToSvg(diagramObj);
                  const dbArtifact = await createDiagramArtifact({
                    userId,
                    workspaceId: projectIdResolved,
                    agentId: ev.createdByAgentId ?? agentId,
                    title: artifact.filename.replace(/\.excalidraw$/i, ""),
                    prompt: "",
                    excalidrawJsonStr: contentText,
                    svgStr,
                  });
                  excalidrawPersistedByRun.add(rk);
                  controller.enqueue(
                    encoder.encode(
                      sseLine("diagram_artifact_created", {
                        artifactType: "diagram.excalidraw",
                        title: dbArtifact.title,
                        files: dbArtifact.files,
                        agentId: dbArtifact.agentId,
                      }),
                    ),
                  );
                  continue;
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : String(err);
                  console.error("[openclaw][diagram_intercept_failed]", msg);
                }
              }
            }

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

            const resolvedResult = await result;
            if (!resolvedResult) continue;

            controller.enqueue(
              encoder.encode(
                sseLine("artifact_persisted", {
                  runId: ev.runId,
                  fileId: resolvedResult.file.id,
                  projectId: resolvedResult.file.projectId,
                  filename: resolvedResult.file.filename,
                  mimeType: resolvedResult.file.mimeType,
                  extension: resolvedResult.file.extension,
                  sizeBytes: resolvedResult.file.sizeBytes,
                  revisionVersionNumber: resolvedResult.file.currentRevision?.versionNumber,
                  updatedAt: resolvedResult.file.updatedAt,
                }),
              ),
            );
          } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to persist artifact.";
            console.error("[openclaw][artifact_persisted][persist]", { message, artifact });
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

      const push = (ev: OpenClawChatBridgeEvent) => {
        try {
          if (ev.type === "artifacts") {
            appendRunWork(ev.runId, () => persistAndEmitArtifacts(ev));
            return;
          }
          if (ev.type === "final") {
            controller.enqueue(encoder.encode(sseLine("openclaw", ev)));
            appendRunWork(ev.runId, () => maybeRunDiagramFallback(ev.runId));
            return;
          }
          controller.enqueue(encoder.encode(sseLine("openclaw", ev)));
        } catch {
          // closed
        }
      };

      try {
        controller.enqueue(
          encoder.encode(
            sseLine("openclaw", {
              type: "status",
              phase: "identity_scaffold",
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
