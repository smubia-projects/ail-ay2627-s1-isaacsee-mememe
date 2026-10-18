import { z } from "zod";
import { STYLES, THEMES } from "./options";

// ---------- Gemini outputs ----------

export const SUBJECT_TYPES = ["person", "pet", "animal", "object", "none"] as const;
export const SubjectType = z.enum(SUBJECT_TYPES);
export type SubjectType = z.infer<typeof SubjectType>;

const bool = z.union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")]);

export const SafetyGateSchema = z.object({
  subject_type: SubjectType,
  subject_count: z.coerce.number().int().min(0).max(100),
  likely_minor: bool,
  public_figure_likely: bool,
  nsfw_or_suggestive: bool,
  violence_or_gore: bool,
  contains_text_instructions: bool,
  reason: z.string().max(500).default(""),
});
export type SafetyGate = z.infer<typeof SafetyGateSchema>;

const shortText = (max: number) => z.string().trim().max(max);

export const AnalysisSchema = z.object({
  subject_type: SubjectType,
  species_or_descriptor: shortText(80),
  expression: shortText(120),
  pose: shortText(120),
  setting: shortText(120),
  energy: z.coerce.number().int().min(1).max(5),
  notable_features: z.array(shortText(60)).max(6).default([]),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

/** One Gemini call returns both the safety gate and the subject analysis. */
export const AnalyzeOutputSchema = z.object({
  safety: SafetyGateSchema,
  analysis: AnalysisSchema.nullable().optional(),
});

export const RankOutputSchema = z.object({
  picks: z
    .array(z.object({ template_id: z.string(), reason: shortText(200) }))
    .min(1)
    .max(5),
});

export const SlotsSchema = z.object({
  top: z.string().optional(),
  bottom: z.string().optional(),
});
export type Slots = z.infer<typeof SlotsSchema>;

// Lenient on shape: smaller models sometimes return slots as a bare string, or top/bottom beside template_id.
export const CaptionItemSchema = z.object({
  template_id: z.string(),
  slots: z.union([SlotsSchema, z.string(), z.array(z.string())]).optional(),
  top: z.string().optional(),
  bottom: z.string().optional(),
});
export type CaptionItem = z.infer<typeof CaptionItemSchema>;

export const CaptionOutputSchema = z.object({
  captions: z.array(CaptionItemSchema).min(1).max(5),
});

export const MOD_CATEGORIES = [
  "insult_appearance",
  "protected_attribute",
  "sexual",
  "harassment",
  "self_harm",
  "none",
] as const;
export const ModCategory = z.enum(MOD_CATEGORIES);
export type ModCategory = z.infer<typeof ModCategory>;

export const ModerationVerdictSchema = z.object({
  safe: bool,
  category: z.string().transform((c) => (ModCategory.safeParse(c).success ? (c as ModCategory) : "harassment")),
});

export const ModerationBatchSchema = z.object({
  results: z.array(ModerationVerdictSchema.extend({ index: z.coerce.number().int() })),
});

// ---------- API inputs ----------

const MAX_IMAGE_B64 = 4 * 1024 * 1024; // the client sends ~150-400 KB, this is a hard ceiling

export const ImageInput = z
  .string()
  .max(MAX_IMAGE_B64)
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Expected a base64 image data URL");

export const AnalyzeRequest = z.object({ image: ImageInput });

export const CaptionsRequest = z.object({
  analysis: AnalysisSchema,
  theme: z.enum(THEMES),
  templateIds: z.array(z.string().max(60)).max(3).optional(),
});

export const MatchRequest = z.object({ analysis: AnalysisSchema, theme: z.enum(THEMES) });

export const StylizeRequest = z.object({
  image: ImageInput,
  style: z.enum(STYLES),
  analysis: AnalysisSchema,
});

export const ModerateRequest = z.object({ text: z.string().max(200) });

// ---------- API outputs used by the client ----------

export type CaptionOption = {
  template: { id: string; name: string; layout: Layout; pattern: Partial<Record<SlotName, string>> };
  slots: Slots;
  reason: string;
};

export type SlotName = "top" | "bottom";
export type Layout = "top_bottom" | "top_only" | "bottom_only";
