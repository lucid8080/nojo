import { describe, expect, it } from "vitest";
import { resolveAgentAvatarVisualForAgent } from "@/lib/nojo/resolveAgentAvatarVisual";
import {
  getAgentAvatarFrameClassFromAgent,
  getCategoryAvatarFrameClass,
} from "@/lib/categoryColors";

describe("resolveAgentAvatarVisualForAgent", () => {
  it("returns hash when no roster entry and no override", () => {
    expect(resolveAgentAvatarVisualForAgent(undefined, undefined)).toEqual({
      kind: "hash",
    });
  });

  it("uses category from roster when no accent override", () => {
    const r = resolveAgentAvatarVisualForAgent(
      {
        id: "nojo-main",
        name: "Mira",
        initials: "MO",
        role: "QA",
        avatarClass: "bg-emerald-500",
        categoryLabel: "SUPPORT",
      },
      undefined,
    );
    expect(r.kind).toBe("palette");
    if (r.kind !== "palette") throw new Error("expected palette");
    expect(r.avatarAccent).toBeUndefined();
    expect(r.frameClass).toBe(
      getAgentAvatarFrameClassFromAgent({
        categoryLabel: "SUPPORT",
        avatarAccent: undefined,
      }),
    );
    expect(r.frameClass).toBe(getCategoryAvatarFrameClass("SUPPORT"));
  });

  it("prefers explicit avatarAccent from override over category", () => {
    const r = resolveAgentAvatarVisualForAgent(
      {
        id: "nojo-main",
        name: "Mira",
        initials: "MO",
        role: "QA",
        avatarClass: "bg-emerald-500",
        categoryLabel: "ENGINEERING",
      },
      { avatarAccent: "pink" },
    );
    expect(r.kind).toBe("palette");
    if (r.kind !== "palette") throw new Error("expected palette");
    expect(r.avatarAccent).toBe("pink");
    expect(r.frameClass).toBe(
      getAgentAvatarFrameClassFromAgent({
        categoryLabel: "ENGINEERING",
        avatarAccent: "pink",
      }),
    );
  });

  it("works with override only (no roster row)", () => {
    const r = resolveAgentAvatarVisualForAgent(undefined, {
      categoryLabel: "MARKETING",
      avatarAccent: "violet",
    });
    expect(r.kind).toBe("palette");
    if (r.kind !== "palette") throw new Error("expected palette");
    expect(r.categoryLabel).toBe("MARKETING");
    expect(r.avatarAccent).toBe("violet");
  });

  it("ignores invalid accent string in override", () => {
    const r = resolveAgentAvatarVisualForAgent(
      {
        id: "x",
        name: "A",
        initials: "A",
        role: "R",
        avatarClass: "bg-slate-500",
        categoryLabel: "SALES",
      },
      { avatarAccent: "not-a-palette-key" },
    );
    expect(r.kind).toBe("palette");
    if (r.kind !== "palette") throw new Error("expected palette");
    expect(r.avatarAccent).toBeUndefined();
  });
});
