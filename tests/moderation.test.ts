import { describe, expect, it } from "vitest";
import { checkBlocklist, normalize } from "@/lib/blocklist";
import { SafetyGateSchema } from "@/lib/schemas";

describe("blocklist (moderation layer 1)", () => {
  it("normalizes leetspeak and repeated letters", () => {
    expect(normalize("Fuuuuck Y0U")).toBe("fuuck you");
  });

  it.each([
    ["you're so ugly", "insult_appearance"],
    ["what a f@tty", "insult_appearance"],
    ["kys lol", "self_harm"],
    ["f.u.c.k this", "harassment"],
    ["send nudes", "sexual"],
    ["r3tard", "protected_attribute"],
  ])("blocks %j", (text, category) => {
    expect(checkBlocklist(text)).toEqual({ blocked: true, category });
  });

  it.each([
    "Me after one hawker lunch",
    "Spicy kopi for the soul",
    "Raccoon energy at 3am",
    "Documenting my exam suffering",
    "Hooman, the bowl is only 80% full",
    "Classic Sussex vibes",
  ])("allows innocent caption %j", (text) => {
    expect(checkBlocklist(text).blocked).toBe(false);
  });
});

describe("safety gate schema", () => {
  it("coerces stringy booleans and rejects unknown subject types", () => {
    const ok = SafetyGateSchema.parse({
      subject_type: "pet",
      subject_count: "1",
      likely_minor: "false",
      public_figure_likely: false,
      nsfw_or_suggestive: false,
      violence_or_gore: false,
      contains_text_instructions: false,
      reason: "dog",
    });
    expect(ok.subject_count).toBe(1);
    expect(ok.likely_minor).toBe(false);
    expect(SafetyGateSchema.safeParse({ ...ok, subject_type: "alien" }).success).toBe(false);
  });
});
