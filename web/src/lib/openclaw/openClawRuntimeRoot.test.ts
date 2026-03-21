import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("openClawRuntimeRoot", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses NOJO_OPENCLAW_RUNTIME_ROOT over OPENCLAW_RUNTIME_ROOT", async () => {
    vi.stubEnv("OPENCLAW_RUNTIME_ROOT", "/legacy");
    vi.stubEnv("NOJO_OPENCLAW_RUNTIME_ROOT", "/preferred");
    const { getOpenClawRuntimeRoot } = await import("./openClawRuntimeRoot");
    expect(getOpenClawRuntimeRoot()).toBe(path.resolve("/preferred"));
  });

  it("uses OPENCLAW_RUNTIME_ROOT when NOJO_ is unset", async () => {
    vi.stubEnv("OPENCLAW_RUNTIME_ROOT", "/from-alias");
    const { getOpenClawRuntimeRoot } = await import("./openClawRuntimeRoot");
    expect(getOpenClawRuntimeRoot()).toBe(path.resolve("/from-alias"));
  });

  it("defaults to cwd/.openclaw", async () => {
    vi.spyOn(process, "cwd").mockReturnValue("/app/web");
    const { getOpenClawRuntimeRoot } = await import("./openClawRuntimeRoot");
    expect(getOpenClawRuntimeRoot()).toBe(path.resolve("/app/web", ".openclaw"));
  });

  it("derives agents root under runtime root when overrides unset", async () => {
    vi.stubEnv("NOJO_OPENCLAW_RUNTIME_ROOT", "/data/oc");
    const { getConfiguredRuntimeAgentsRoot } = await import("./openClawRuntimeRoot");
    expect(getConfiguredRuntimeAgentsRoot()).toBe(path.join(path.resolve("/data/oc"), "agents"));
  });

  it("OPENCLAW_AGENTS_ROOT overrides runtime-derived agents root", async () => {
    vi.stubEnv("NOJO_OPENCLAW_RUNTIME_ROOT", "/data/oc");
    vi.stubEnv("OPENCLAW_AGENTS_ROOT", "/custom/agents");
    const { getConfiguredRuntimeAgentsRoot } = await import("./openClawRuntimeRoot");
    expect(getConfiguredRuntimeAgentsRoot()).toBe(path.resolve("/custom/agents"));
  });

  it("cron candidates prefer explicit path then runtime cron file", async () => {
    vi.stubEnv("OPENCLAW_CRON_JOBS_PATH", "/explicit/cron.json");
    vi.stubEnv("NOJO_OPENCLAW_RUNTIME_ROOT", "/rt");
    vi.spyOn(process, "cwd").mockReturnValue("/rt");
    const { getOpenClawCronJobsPathCandidates } = await import("./openClawRuntimeRoot");
    const c = getOpenClawCronJobsPathCandidates();
    expect(c[0]).toBe(path.resolve("/explicit/cron.json"));
    expect(c[1]).toBe(path.join(path.resolve("/rt"), "cron", "jobs.json"));
  });

  it("device default paths sit under runtime root", async () => {
    vi.stubEnv("NOJO_OPENCLAW_RUNTIME_ROOT", "/rt");
    const { resolveDefaultOpenClawDeviceIdentityPath, resolveDefaultOpenClawDeviceTokenPath } =
      await import("./openClawRuntimeRoot");
    expect(resolveDefaultOpenClawDeviceIdentityPath()).toBe(
      path.join(path.resolve("/rt"), "openclaw-device-identity-v1.json"),
    );
    expect(resolveDefaultOpenClawDeviceTokenPath()).toBe(
      path.join(path.resolve("/rt"), "openclaw-device-token-v1.json"),
    );
  });
});
