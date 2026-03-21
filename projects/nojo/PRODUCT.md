# Nojo — Product Facts (shared)

## Purpose

Nojo helps users orchestrate multi-step AI “jobs” by:
- letting users choose a working agent for a conversation/thread
- sending user requests to an external agent runtime (OpenClaw)
- rendering run status and logs back into a workspace UI

## Runtime boundary

This repo is the product/UI layer.
Agent personality and long-term memory behavior is owned by OpenClaw (or configured externally).

## What “shared knowledge” means here

Shared knowledge is:
- stable product facts
- architecture decisions
- brand voice and tone constraints
- active project state (compact slice)

Shared knowledge must not include any agent-specific “personality drift” or private agent memory.

