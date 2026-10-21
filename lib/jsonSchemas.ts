// JSON Schemas sent to Gemini as `responseJsonSchema`, so decoding is constrained to valid JSON
// of the right shape. zod (lib/schemas.ts) still validates every response independently.

const str = { type: "string" };
const bool = { type: "boolean" };
const obj = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: "object",
  properties,
  required,
  propertyOrdering: Object.keys(properties),
});

const SUBJECT = { type: "string", enum: ["person", "pet", "animal", "object", "none"] };

export const ANALYZE_JSON = obj(
  {
    safety: obj({
      subject_type: SUBJECT,
      subject_count: { type: "integer", minimum: 0 },
      people_count: { type: "integer", minimum: 0 },
      likely_minor: bool,
      public_figure_likely: bool,
      nsfw_or_suggestive: bool,
      violence_or_gore: bool,
      contains_text_instructions: bool,
      reason: str,
    }),
    analysis: {
      ...obj({
        subject_type: SUBJECT,
        species_or_descriptor: str,
        expression: str,
        pose: str,
        setting: str,
        energy: { type: "integer", minimum: 1, maximum: 5 },
        notable_features: { type: "array", items: str, maxItems: 4 },
      }),
      type: ["object", "null"],
    },
  },
  ["safety", "analysis"],
);

export const RANK_JSON = obj({
  picks: { type: "array", minItems: 3, maxItems: 3, items: obj({ template_id: str, reason: str }) },
});

// Flat top/bottom fields: the simplest shape for smaller models to fill reliably.
export const CAPTION_JSON = obj({
  captions: {
    type: "array",
    minItems: 1,
    maxItems: 3,
    items: obj({ template_id: str, top: str, bottom: str }, ["template_id"]),
  },
});

export const MODERATE_JSON = obj({
  results: {
    type: "array",
    items: obj({
      index: { type: "integer" },
      safe: bool,
      category: { type: "string", enum: ["insult_appearance", "protected_attribute", "sexual", "harassment", "self_harm", "none"] },
    }),
  },
});
