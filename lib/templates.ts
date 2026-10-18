import { z } from "zod";
import raw from "@/data/meme_templates.json";
import { THEMES, type Theme } from "./options";
import { SUBJECT_TYPES, type Analysis } from "./schemas";
export { renderLines } from "./render";

const SlotNameSchema = z.enum(["top", "bottom"]);
const SlotText = z.string().min(1).max(60);

export const TemplateSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_]+$/),
    name: z.string().min(1),
    layout: z.enum(["top_bottom", "top_only", "bottom_only"]),
    slots: z.array(SlotNameSchema).min(1).max(2),
    pattern: z.object({ top: z.string().optional(), bottom: z.string().optional() }),
    themes: z.array(z.enum(THEMES)).min(1),
    subjects: z.array(z.enum(SUBJECT_TYPES).exclude(["none"])).min(1),
    tags: z.array(z.string()).min(1),
    example: z.object({ top: SlotText.optional(), bottom: SlotText.optional() }),
    safe_fallback: z.object({ top: SlotText.optional(), bottom: SlotText.optional() }),
  })
  .superRefine((t, ctx) => {
    const positions = (["top", "bottom"] as const).filter((p) => t.pattern[p] !== undefined);
    const expected =
      t.layout === "top_bottom" ? ["top", "bottom"] : t.layout === "top_only" ? ["top"] : ["bottom"];
    if (positions.join() !== expected.join()) {
      ctx.addIssue({ code: "custom", message: `${t.id}: pattern positions don't match layout ${t.layout}` });
    }
    for (const s of t.slots) {
      if (!t.pattern[s]?.includes(`{${s}}`)) {
        ctx.addIssue({ code: "custom", message: `${t.id}: pattern.${s} must contain {${s}}` });
      }
      if (!t.example[s] || !t.safe_fallback[s]) {
        ctx.addIssue({ code: "custom", message: `${t.id}: example and safe_fallback need slot ${s}` });
      }
    }
  });

export type MemeTemplate = z.infer<typeof TemplateSchema>;

export const TemplatesFileSchema = z
  .array(TemplateSchema)
  .min(20)
  .superRefine((list, ctx) => {
    const ids = new Set<string>();
    for (const t of list) {
      if (ids.has(t.id)) ctx.addIssue({ code: "custom", message: `duplicate id ${t.id}` });
      ids.add(t.id);
    }
    for (const theme of THEMES) {
      const n = list.filter((t) => t.themes.includes(theme)).length;
      if (n < 5) ctx.addIssue({ code: "custom", message: `theme ${theme} has only ${n} templates` });
    }
  });

// Validated once at module load: a bad dataset fails the build/startup, not a user request.
export const TEMPLATES: MemeTemplate[] = TemplatesFileSchema.parse(raw);
const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string) {
  return BY_ID.get(id);
}

/** Step A: code filter by theme and subject. Falls back to theme-only if nothing matches. */
export function filterTemplates(theme: Theme, subject: Analysis["subject_type"]): MemeTemplate[] {
  const byTheme = TEMPLATES.filter((t) => t.themes.includes(theme));
  const bySubject = byTheme.filter((t) => subject !== "none" && t.subjects.includes(subject));
  return bySubject.length >= 3 ? bySubject : byTheme;
}

function words(s: string) {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
}

/** Fallback ranker: overlap between a template's tags and words in the analysis. */
export function tagOverlapRank(candidates: MemeTemplate[], analysis: Analysis): MemeTemplate[] {
  const bag = new Set(
    words(
      [analysis.expression, analysis.pose, analysis.setting, analysis.species_or_descriptor, ...analysis.notable_features].join(
        " ",
      ),
    ),
  );
  bag.add(analysis.energy >= 4 ? "energy_high" : analysis.energy <= 2 ? "energy_low" : "energy_mid");
  if (analysis.subject_type === "pet" || analysis.subject_type === "animal") bag.add("pet");

  const score = (t: MemeTemplate) =>
    t.tags.reduce((acc, tag) => acc + (tag.split("_").some((part) => bag.has(part)) || bag.has(tag) ? 1 : 0), 0);

  return [...candidates]
    .map((t, i) => ({ t, s: score(t), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.t);
}

/** Public, client-safe shape of a template. */
export function publicTemplate(t: MemeTemplate) {
  return { id: t.id, name: t.name, layout: t.layout, pattern: t.pattern };
}
