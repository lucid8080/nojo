import { describe, expect, it } from "vitest";

import {
  assertExtensionUploadAllowed,
  extensionFromFilename,
  resolveMimeTypeForExtension,
} from "./nojoFileTypes";

describe("nojoFileTypes", () => {
  it("extracts extension from filename", () => {
    expect(extensionFromFilename("resume.PDF")).toBe("pdf");
    expect(extensionFromFilename("notes.md")).toBe("md");
    expect(extensionFromFilename("no-extension")).toBeNull();
  });

  it("maps common extensions to mime types", () => {
    expect(resolveMimeTypeForExtension("txt")).toContain("text/plain");
    expect(resolveMimeTypeForExtension("md")).toContain("text/markdown");
    expect(resolveMimeTypeForExtension("json")).toContain("application/json");
    expect(resolveMimeTypeForExtension("csv")).toContain("text/csv");
    expect(resolveMimeTypeForExtension("pdf")).toBe("application/pdf");
    expect(resolveMimeTypeForExtension("rtf")).toBe("application/rtf");
    expect(resolveMimeTypeForExtension("docx")).toContain("wordprocessingml");
    expect(resolveMimeTypeForExtension("png")).toBe("image/png");
  });

  it("denies obviously unsafe executable/script extensions", () => {
    expect(() => assertExtensionUploadAllowed("exe")).toThrow();
    expect(() => assertExtensionUploadAllowed("js")).toThrow();
    expect(() => assertExtensionUploadAllowed("zip")).toThrow();
  });

  it("allows svg for trusted server-generated diagram artifacts", () => {
    expect(assertExtensionUploadAllowed("svg")).toBe("svg");
    expect(resolveMimeTypeForExtension("svg")).toBe("image/svg+xml");
  });

  it("allows unknown non-denylisted extensions (served as octet-stream)", () => {
    // MVP policy: permit unknown extensions as storage blobs, but map to octet-stream.
    const ext = assertExtensionUploadAllowed("abc123");
    expect(ext).toBe("abc123");
    expect(resolveMimeTypeForExtension(ext)).toBe("application/octet-stream");
  });
});

