# Nojo — Architecture Decisions (shared)

## D1: Stable, namespaced Nojo agent IDs

Nojo agents must use project-prefixed OpenClaw `agentId` values:
- `nojo-main`
- `nojo-builder`
- `nojo-support`
- `nojo-sales`
- `nojo-content`

This prevents collisions with personal/general agents and makes identity stable across sessions.

## D2: “Shared knowledge” injection is selective

Runtime prompt injection must be gated by Nojo agent identity.
Non-Nojo/personal/general agents must not receive Nojo shared documents.

Default injection includes:
- `ACTIVE_CONTEXT.md`
- `BRAND_VOICE.md`

Larger docs (e.g. decisions/roadmap) are optional and should only be included when the user’s prompt indicates a need.

## D3: Fix OpenClaw generic fallback collisions

When `agentId` is missing/empty, scoping defaults must resolve to `nojo-main` (not generic `main`/`default`).

This avoids multiple identities collapsing into a single OpenClaw session key.

