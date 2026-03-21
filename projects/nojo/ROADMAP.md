# Nojo — Roadmap (shared)

## Near-term (this sprint)

- Define isolated Nojo agent set:
  - `nojo-main`
  - `nojo-builder`
  - `nojo-support`
  - `nojo-sales`
  - `nojo-content`
- Scoping:
  - Prevent OpenClaw “generic fallback” collisions by ensuring missing/empty `agentId` resolves to `nojo-main`.
- Shared prompt wiring:
  - Default inject `ACTIVE_CONTEXT.md` + `BRAND_VOICE.md`.
  - Inject `DECISIONS.md`/others only when needed.

## Next milestones

- Replace workspace mocks with Nojo-specific agents wired to real endpoints (jobs/runs).
- Persist per-agent memory and daily notes (file or DB) keyed by Nojo agent identity.

