# Nojo — Project Context (shared)

This folder contains Nojo project knowledge that is intended to be shared across all Nojo project agents.

Design principles:
- Shared layer contains product facts, architecture decisions, and durable project state.
- Agent-specific personality and memory must not be stored here.
- Only the compact “active” slice should be treated as safe-by-default for prompt injection.

## What this project is

Nojo is an AI-agent orchestration SaaS UI that routes user requests into an external agent runtime (OpenClaw) and presents:
- job/workflow execution timelines
- per-agent message attribution
- run status + logs
- agent/workspace boundaries

## Where “shared” lives

Shared knowledge files:
- `ACTIVE_CONTEXT.md` (compact, safe to include in prompts)
- `PRODUCT.md` (product facts)
- `BRAND_VOICE.md` (tone constraints)
- `DECISIONS.md` (architecture decisions)
- `ROADMAP.md` (milestones)

## Notes for implementers

When adding prompt wiring, prefer:
- injecting `ACTIVE_CONTEXT.md` + `BRAND_VOICE.md` by default
- injecting larger context docs only when the user’s request clearly needs them

