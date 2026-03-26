import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { OpenClawError } from "@/lib/openclaw/client";
import { getOpenClawRoomBridge } from "@/lib/openclaw/openclaw-chat-bridge";
import { composeNojoSharedContextPrompt } from "@/lib/nojo/nojoSharedContext";
import {
  buildNovaContentQaPayload,
  ensureNojoAgentIdentityScaffold,
} from "@/lib/nojo/ensureNojoAgentIdentityScaffold";
import { ensureUserWorkspaceAgentIdentityScaffold } from "@/lib/nojo/ensureUserWorkspaceAgentIdentityScaffold";
import { canonicalizeAgentId } from "@/lib/nojo/agentIdCanonicalization";
import { isUserCreatedWorkspaceAgentId } from "@/lib/workspace/userWorkspaceAgentServer";
import { scheduleWorkspaceRemindersFromChat } from "@/lib/reminders/scheduleWorkspaceRemindersFromChat";
import { getUserTimeZoneFromDb } from "@/lib/reminders/userTimeZoneDb";
import { getCronJobsBundle } from "@/lib/openclaw/cronJobsBundle";

export const runtime = "nodejs";

type Body = {
  prompt?: unknown;
  conversationId?: unknown;
  agentId?: unknown;
  idempotencyKey?: unknown;
  isFirstUserMessage?: unknown;
};

function randomIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `nojo_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to chat." },
        { status: 401 },
      );
    }

    const body = (await req.json()) as Body;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ success: false, message: "Missing prompt." }, { status: 400 });
    }
    if (prompt.length > 20000) {
      return NextResponse.json({ success: false, message: "prompt is too long." }, { status: 400 });
    }

    const conversationId =
      typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    if (!conversationId) {
      return NextResponse.json(
        { success: false, message: "Missing conversationId." },
        { status: 400 },
      );
    }

    const agentIdRaw = typeof body.agentId === "string" ? body.agentId.trim() : "";
    if (!agentIdRaw) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing agentId. Nojo chat requires an explicit project agent id (e.g. nojo-main).",
        },
        { status: 400 },
      );
    }
    const canonical = canonicalizeAgentId(agentIdRaw);
    const agentId = canonical.effectiveAgentId;
    const isFirstUserMessage = body.isFirstUserMessage === true;
    const idempotencyKey =
      typeof body.idempotencyKey === "string" && body.idempotencyKey.trim() !== ""
        ? body.idempotencyKey.trim()
        : randomIdempotencyKey();

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

    console.info("[openclaw-qa][send.identity]", {
      requestedAgentId: canonical.requestedAgentId,
      effectiveAgentId: canonical.effectiveAgentId,
      matchedNojoAgent: canonical.matchedNojoAgent,
      matchedLegacyAlias: canonical.matchedLegacyAlias,
      legacyAliasUsed: canonical.legacyAliasUsed,
      isFirstUserMessage,
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
    const composed = await composeNojoSharedContextPrompt({
      agentId,
      prompt,
      isFirstUserMessage,
      userId,
    });
    let promptToSend = composed.isNojoAgent ? composed.composedPrompt : prompt;

    const userTimeZone = await getUserTimeZoneFromDb(userId);

    const lowerPrompt = prompt.toLowerCase();
    const wantsSchedule = /schedule|calendar|upcoming|reminders?/i.test(lowerPrompt);

    if (wantsSchedule) {
      try {
        const now = new Date();
        const bundle: any = await getCronJobsBundle(now.getFullYear(), now.getMonth());
        
        if (bundle?.success && Array.isArray(bundle?.jobs)) {
          const upcoming = bundle.jobs.filter((j: any) => {
            if (!j.nextRunAt) return false;
            if (j.ownership && j.ownership.createdByUserId !== userId) return false;
            const runTime = new Date(j.nextRunAt).getTime();
            return runTime >= now.getTime() - 86400000;
          });
          
          upcoming.sort((a: any, b: any) => new Date(a.nextRunAt!).getTime() - new Date(b.nextRunAt!).getTime());
          const limited = upcoming.slice(0, 20);
          
          if (limited.length > 0) {
            const tz = userTimeZone || "UTC";
            const scheduleBlock = [
              "NOJO_USER_SCHEDULE_CONTEXT (read-only reference):",
              `The user asked about their schedule or reminders. Here are their upcoming scheduled jobs (Current TimeZone: ${tz}):`,
              ...limited.map((j: any) => {
                const dateRaw = j.nextRunAt!;
                let formatted = dateRaw;
                try {
                  formatted = new Date(dateRaw).toLocaleString("en-US", { timeZone: tz });
                } catch { /* ignore */ }
                return `- [${formatted}] ${j.name} (Job ID: ${j.id}) - Schedule: ${j.scheduleDisplay}`;
              }),
              "(Use this context to accurately answer the user's question about their existing schedule and reminder times.)"
            ].join("\n");
            promptToSend = `${promptToSend}\n\n${scheduleBlock}`;
          } else {
            const scheduleBlock = "NOJO_USER_SCHEDULE_CONTEXT: The user has no upcoming scheduled jobs or reminders in the current month.";
            promptToSend = `${promptToSend}\n\n${scheduleBlock}`;
          }
        }
      } catch (err) {
        console.error("[openclaw-qa][send.schedule_inject_error]", err);
      }
    }

    let reminderOutcome: Awaited<ReturnType<typeof scheduleWorkspaceRemindersFromChat>>;
    try {
      reminderOutcome = await scheduleWorkspaceRemindersFromChat({
        userId,
        conversationId,
        agentId,
        userTimeZone,
        prompt,
      });
    } catch (remErr) {
      const msg = remErr instanceof Error ? remErr.message : String(remErr);
      reminderOutcome = {
        scheduled: [],
        errors: [msg],
        confirmationBlock: `NOJO_REMINDER_ERRORS: Could not reach OpenClaw Gateway to schedule reminders (${msg}). The user message is still being sent.`,
      };
    }
    if (reminderOutcome.confirmationBlock) {
      promptToSend = `${promptToSend}\n\n${reminderOutcome.confirmationBlock}`;
    }
    if (reminderOutcome.scheduled.length > 0) {
      console.info("[openclaw-qa][send.reminders]", {
        count: reminderOutcome.scheduled.length,
        jobIds: reminderOutcome.scheduled.map((s) => s.jobId ?? null),
        conversationId,
        agentId,
      });
    }

    await bridge.sendUserMessage(promptToSend, idempotencyKey);

    return NextResponse.json({
      success: true,
      sessionKey: bridge.sessionKey,
      idempotencyKey,
      scheduledReminders: reminderOutcome.scheduled,
      reminderErrors: reminderOutcome.errors,
      isFirstUserMessage,
      firstTurnIdentityFallbackApplied: composed.firstTurnIdentityFallbackApplied,
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
    });
  } catch (err) {
    if (err instanceof OpenClawError && err.code === "CONFIG") {
      return NextResponse.json(
        { success: false, message: err.message, code: err.code },
        { status: 500 },
      );
    }

    if (err instanceof OpenClawError) {
      const httpStatus = err.code === "TIMEOUT" ? 504 : 502;
      return NextResponse.json(
        {
          success: false,
          message: err.message,
          code: err.code,
        },
        { status: httpStatus },
      );
    }

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
