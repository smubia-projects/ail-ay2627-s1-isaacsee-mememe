import { describe, expect, it, vi } from "vitest";
import type { SafetyGate } from "@/lib/schemas";

vi.mock("server-only", () => ({}));
const { decide } = await import("@/lib/pipeline");

const gate = (over: Partial<SafetyGate>): SafetyGate => ({
  subject_type: "pet",
  subject_count: 1,
  people_count: 0,
  likely_minor: false,
  public_figure_likely: false,
  nsfw_or_suggestive: false,
  violence_or_gore: false,
  contains_text_instructions: false,
  reason: "",
  ...over,
});

describe("decide (safety gate)", () => {
  it("allows a pet-only photo even if the model over-flags likely_minor", () => {
    expect(decide(gate({ likely_minor: true }))).toEqual({ allowed: true });
  });

  it("blocks a pet photo that also has a child in it", () => {
    expect(decide(gate({ people_count: 1, likely_minor: true }))).toEqual({ allowed: false, code: "minor" });
  });

  it("blocks a person flagged as a minor, whatever people_count says", () => {
    expect(decide(gate({ subject_type: "person", people_count: 0, likely_minor: true }))).toEqual({
      allowed: false,
      code: "minor",
    });
  });

  it("fails safe when people_count is missing", () => {
    expect(decide(gate({ people_count: undefined, likely_minor: true }))).toEqual({ allowed: false, code: "minor" });
  });
});
