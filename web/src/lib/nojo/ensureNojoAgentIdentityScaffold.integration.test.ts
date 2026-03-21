import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureNojoAgentIdentityScaffold, SCAFFOLD_FILES } from "./ensureNojoAgentIdentityScaffold";

describe("ensureNojoAgentIdentityScaffold (integration)", () => {
  let agentsRoot: string | undefined;

  afterEach(async () => {
    if (agentsRoot) {
      await rm(agentsRoot, { recursive: true, force: true });
      agentsRoot = undefined;
    }
    delete process.env.OPENCLAW_AGENTS_ROOT;
    delete process.env.OPENCLAW_AGENT_WORKSPACES_ROOT;
    delete process.env.NOJO_OPENCLAW_RUNTIME_ROOT;
    delete process.env.OPENCLAW_RUNTIME_ROOT;
  });

  it("seeds an empty runtime workspace from repo templates", async () => {
    agentsRoot = await mkdtemp(path.join(tmpdir(), "nojo-oc-scaffold-"));
    process.env.OPENCLAW_AGENTS_ROOT = agentsRoot;

    const r = await ensureNojoAgentIdentityScaffold({ agentId: "nojo-content" });

    expect(r.seeded).toBe(true);
    expect(r.seededFiles.length).toBeGreaterThan(0);
    expect(r.fileReports).toHaveLength(SCAFFOLD_FILES.length);
    expect(r.templateRootResolved).toContain(path.join("projects", "nojo", "agents", "nojo-content"));
    expect(r.configuredAgentsRoot).toBe(path.resolve(agentsRoot));
    expect(r.runtimeWorkspaceAbsPath).toBe(path.join(path.resolve(agentsRoot), "nojo-content", "workspace"));

    const idSnap = r.runtimeFileSnapshot["IDENTITY.md"];
    expect(idSnap?.exists).toBe(true);
    expect(idSnap?.byteLength ?? 0).toBeGreaterThan(0);
    expect(r.runtimeIdentityFingerprint.length).toBe(64);
    expect(r.genericFallbackRisk).toBe(false);

    const onDisk = await readFile(path.join(r.runtimeWorkspaceAbsPath, "IDENTITY.md"), "utf8");
    expect(onDisk).toContain("nojo-content");
  });
});
