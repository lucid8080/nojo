# Nojo agent isolation — current seam audit

This document tracks the current first-message identity routing for workspace chat and where legacy IDs are reconciled.

## 1) Source of `agentId` in workspace UI

- `web/src/data/workspaceChatMock.ts`
  - `WorkspaceAgent.id` and `Conversation.primaryAgentId` are canonical Nojo IDs (`nojo-*`).
  - Display names (Nova Chen, Kite Park, etc.) are UI labels and are not runtime IDs.

## 2) Runtime ingress points and canonicalization

Both runtime ingress points canonicalize incoming IDs before bridge/session/scaffold logic:

- `web/src/app/api/openclaw/chat/send/route.ts`
  - Reads request `agentId`.
  - Canonicalizes via `canonicalizeAgentId(...)`.
  - Uses canonical `effectiveAgentId` for:
    - `ensureNojoAgentIdentityScaffold(...)`
    - `composeNojoSharedContextPrompt(...)`
    - `getOpenClawRoomBridge(...)` / `chat.send`
- `web/src/app/api/openclaw/chat/stream/route.ts`
  - Reads query `agentId`.
  - Canonicalizes via `canonicalizeAgentId(...)`.
  - Uses canonical `effectiveAgentId` for:
    - `ensureNojoAgentIdentityScaffold(...)`
    - `getOpenClawRoomBridge(...)` / SSE subscription

## 3) Legacy alias reconciliation

- `web/src/lib/nojo/agentIdentityMap.ts`
  - Canonical IDs:
    - `nojo-main`, `nojo-builder`, `nojo-support`, `nojo-sales`, `nojo-content`
  - Legacy aliases:
    - `nova -> nojo-content`
    - `kite -> nojo-sales`
    - `mira -> nojo-main`
    - `ellis -> nojo-builder`
    - `juno -> nojo-support`
- `web/src/lib/nojo/agentIdCanonicalization.ts`
  - Produces:
    - `requestedAgentId`
    - `effectiveAgentId`
    - `matchedNojoAgent`
    - `matchedLegacyAlias`
    - `legacyAliasUsed` (when applicable)

## 4) Session and bridge identity scoping

Canonical `effectiveAgentId` now scopes both layers:

- `web/src/lib/openclaw/openclaw-chat-bridge.ts`
  - Bridge key: `${userId}::${conversationId}::${agentId}`
  - Missing `agentId` throws (no generic fallback bucket).
- `web/src/lib/openclaw/gateway-session-key.ts`
  - Session key: `agent:${agentId}:webchat:direct:nojo:${userId}:${conversationId}`
  - Missing `agentId` throws.

## 5) Temporary QA telemetry

Temporary debug fields and logs are emitted to verify first-message behavior:

- Send route JSON + server log (`[openclaw-qa][send.identity]`):
  - `requestedAgentId`, `effectiveAgentId`
  - `matchedNojoAgent`, `matchedLegacyAlias`, `legacyAliasUsed`
  - `identityScaffoldChecked`, `identityScaffoldSeeded`, `identityScaffoldAgentId`
- Stream status SSE + server log (`[openclaw-qa][stream.identity]`):
  - same fields as send route
- Workspace client logs:
  - `[openclaw-qa][send.identity]`
  - `[openclaw-qa][stream.identity]`

## 6) Identity bootstrap prompt origin

The app side does not synthesize "Who am I?" bootstrap text. The app:

- canonicalizes agent IDs,
- ensures scaffold files exist for Nojo agents,
- forwards prompts to OpenClaw runtime.

If bootstrap-style identity text appears, it is runtime behavior from the effective agent workspace/session state, now traceable through the QA fields above.

