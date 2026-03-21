import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

/**
 * Resolve `projects/nojo/agents/{agentId}` by walking up from `process.cwd()`.
 * Used for scaffold templates and first-turn identity fallback (must match scaffold).
 */
export async function resolveRepoNojoAgentTemplateRoot(agentId: string): Promise<string> {
  const id = agentId.trim();
  if (!id) {
    throw new Error("Missing agentId for Nojo template root resolution.");
  }
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, "projects", "nojo", "agents", id);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // continue upward
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not resolve Nojo template scaffold for agentId "${id}".`);
}
