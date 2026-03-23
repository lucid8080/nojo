import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildRevisionStorageKey,
  getDisplayFilename,
  resolveStorageAbsPath,
} from "./nojoFileStorage";

describe("nojoFileStorage", () => {
  it("sanitizes filenames and preserves extension lowercasing", () => {
    const r = getDisplayFilename({ originalFilename: "../My Resume (Final).PDF" });
    expect(r.extension).toBe("pdf");
    expect(r.sanitizedFilename.toLowerCase()).toMatch(/\.pdf$/);
    // No traversal segments leak into the sanitized name.
    expect(r.sanitizedFilename).not.toContain("..");
    expect(r.sanitizedFilename).not.toContain("/");
    expect(r.sanitizedFilename).not.toContain("\\");
  });

  it("prevents path traversal when resolving storage absolute path", () => {
    const rootAbs = path.join(os.tmpdir(), "nojo-files-test-root");
    expect(() =>
      resolveStorageAbsPath({ rootAbs, storageKey: "../evil.txt" }),
    ).toThrow(/outside storage root/i);
  });

  it("rejects invalid id segments when building storage key", () => {
    expect(() =>
      buildRevisionStorageKey({
        userId: "../bad",
        projectId: "p",
        projectFileId: "f",
        revisionId: "r",
        extension: "txt",
      }),
    ).toThrow();
  });
});

