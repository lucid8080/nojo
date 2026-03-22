import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_CRON_GATEWAY_SCOPES,
  getCronGatewayScopesFromEnv,
} from "@/lib/openclaw/openClawCronGateway";

describe("getCronGatewayScopesFromEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to read, write, admin", () => {
    vi.stubEnv("NOJO_OPENCLAW_CRON_GATEWAY_SCOPES", "");
    expect(getCronGatewayScopesFromEnv()).toEqual([...DEFAULT_CRON_GATEWAY_SCOPES]);
  });

  it("parses comma-separated override", () => {
    vi.stubEnv("NOJO_OPENCLAW_CRON_GATEWAY_SCOPES", " operator.admin , operator.read ");
    expect(getCronGatewayScopesFromEnv()).toEqual(["operator.admin", "operator.read"]);
  });

  it("falls back to default when override is only whitespace", () => {
    vi.stubEnv("NOJO_OPENCLAW_CRON_GATEWAY_SCOPES", "  ,  , ");
    expect(getCronGatewayScopesFromEnv()).toEqual([...DEFAULT_CRON_GATEWAY_SCOPES]);
  });
});
