import { describe, expect, it } from "vitest";
import { parseSkillMarkdownImport } from "./parseSkillMarkdownImport";

describe("parseSkillMarkdownImport", () => {
  it("extracts title from first heading and slug from title", () => {
    const md = `# City of Toronto Jobs

Some body here.
`;
    const r = parseSkillMarkdownImport(md, {
      filename: "city-of-toronto-jobs-full-skill-definition.md",
    });
    expect(r.title).toBe("City of Toronto Jobs");
    expect(r.slug).toBe("city-of-toronto-jobs");
    expect(r.fullDefinitionMarkdown).toBe(md);
    expect(r.sourceTypeSuggestion).toBe("IMPORTED_MARKDOWN");
  });

  it("strips full-skill-definition from filename for slug when no heading", () => {
    const md = "No heading at all.\n\nParagraph.";
    const r = parseSkillMarkdownImport(md, {
      filename: "ontario-residential-tenancy-full-skill-definition.md",
    });
    expect(r.slug).toBe("ontario-residential-tenancy");
    expect(r.title).toContain("Ontario");
  });

  it("works with windows path in filename", () => {
    const md = "# My Skill\n";
    const r = parseSkillMarkdownImport(md, {
      filename: "C:\\docs\\my-skill-full-skill-definition.md",
    });
    expect(r.title).toBe("My Skill");
    expect(r.slug).toBe("my-skill");
  });
});
