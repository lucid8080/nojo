import { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { getOpenClawRoomBridge, type OpenClawChatBridgeEvent } from "@/lib/openclaw/openclaw-chat-bridge";
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
