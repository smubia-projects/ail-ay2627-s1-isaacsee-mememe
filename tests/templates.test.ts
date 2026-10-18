import { describe, expect, it } from "vitest";
import raw from "@/data/meme_templates.json";
import { THEMES } from "@/lib/options";
import { TEMPLATES, TemplatesFileSchema, filterTemplates, renderLines, tagOverlapRank } from "@/lib/templates";
import type { Analysis } from "@/lib/schemas";

const dog: Analysis = {
  subject_type: "pet",
  species_or_descriptor: "golden retriever",
  expression: "sleepy, eyes half closed",
  pose: "lying down on the sofa",
  setting: "living room",
  energy: 1,
  notable_features: ["tongue out"],
};

describe("meme template dataset", () => {
  it("validates against the schema", () => {
    expect(() => TemplatesFileSchema.parse(raw)).not.toThrow();
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(25);
  });

  it("has at least 5 templates per theme", () => {
    for (const t of THEMES) expect(TEMPLATES.filter((x) => x.themes.includes(t)).length).toBeGreaterThanOrEqual(5);
  });

  it("examples and fallbacks fit in 60 chars and render without leftover placeholders", () => {
    for (const t of TEMPLATES) {
      for (const slots of [t.example, t.safe_fallback]) {
        const lines = renderLines(t, slots);
        for (const l of Object.values(lines)) expect(l).not.toMatch(/\{(top|bottom)\}/);
      }
    }
  });

  it("rejects a template whose pattern is missing its slot", () => {
    const bad = [...raw, { ...raw[0], id: "broken", pattern: { top: "Nobody:", bottom: "Me:" } }];
    expect(TemplatesFileSchema.safeParse(bad).success).toBe(false);
  });

  it("filters by theme and subject, never returning pet-only formats for objects", () => {
    const list = filterTemplates("cute", "object");
    expect(list.length).toBeGreaterThanOrEqual(3);
    for (const t of list) expect(t.themes).toContain("cute");
    expect(list.find((t) => t.id === "pet_hooman")).toBeUndefined();
  });

  it("tag-overlap fallback ranks a sleepy pet toward low-energy formats", () => {
    const ranked = tagOverlapRank(filterTemplates("funny", "pet"), dog).slice(0, 5).map((t) => t.id);
    expect(ranked.some((id) => ["me_after", "monday_mood", "no_thoughts", "loading"].includes(id))).toBe(true);
  });
});
