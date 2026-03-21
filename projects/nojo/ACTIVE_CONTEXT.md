# Active Context (compact)

Use this as the safe-by-default “shared slice” for Nojo agents.

## Current product facts

- Product name: **Nojo**
- Core runtime: **OpenClaw** (external agent execution)
- UI behavior: workspace chat + per-run status/logs via Next.js route handlers

## Current priorities (engineering)

1. Implement project agent isolation so identity/personality and memory do not bleed across projects.
2. Ensure Nojo agents have stable, namespaced `agentId`s when calling OpenClaw.
3. Add selective injection of shared knowledge (product facts/decisions/brand voice) into Nojo agent prompts.
4. Ensure existing personal/general agents remain untouched unless the user explicitly reconfigures Nojo agent identity.

## Safety boundaries

- Shared context: allowed for `ACTIVE_CONTEXT.md`, `PRODUCT.md`, `BRAND_VOICE.md`, and specific decision notes.
- Isolated memory: never written/read from shared layer.
- Identity drift: Nojo agent identities must remain stable unless user intentionally edits their `IDENTITY.md`.

