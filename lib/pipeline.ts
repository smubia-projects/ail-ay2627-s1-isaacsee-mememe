import "server-only";
import { checkBlocklist } from "./blocklist";
import { generateJson, imagePart } from "./llm";
import { ANALYZE_JSON, CAPTION_JSON, MODERATE_JSON, RANK_JSON } from "./jsonSchemas";
import type { Theme } from "./options";
import {
  ANALYZE_SYSTEM,
  CAPTION_SYSTEM,
  MODERATE_SYSTEM,
  RANK_SYSTEM,
  captionPrompt,
  moderatePrompt,
  rankPrompt,
} from "./prompts";
import {
  AnalyzeOutputSchema,
  CaptionOutputSchema,
  ModerationBatchSchema,
  RankOutputSchema,
  type Analysis,
  type CaptionItem,
  type CaptionOption,
  type ModCategory,
  type SafetyGate,
  type Slots,
} from "./schemas";
import { filterTemplates, getTemplate, publicTemplate, renderLines, tagOverlapRank, type MemeTemplate } from "./templates";

/** Dev-only fault injection for the safety eval (cases 9 + 10), from the `x-mememe-eval` header. Ignored in production. */
export function evalFault(header: string | null | undefined): string | null {
  if (process.env.NODE_ENV === "production") return null;
  return header || null;
}

// ---------- [1] + [2] ----------

export type BlockCode = "no_subject" | "minor" | "public_figure" | "nsfw" | "violence" | "too_many";

export const BLOCK_MESSAGES: Record<BlockCode, string> = {
  no_subject: "We couldn't find a clear subject. Try a closer photo of one person or pet.",
  minor: "We don't make stickers of kids, to keep them safe. Try a photo of yourself or your pet.",
  public_figure:
    "This looks like it might be a well-known person. To prevent impersonation, we only make stickers of you, your friends or your pets.",
  nsfw: "We can't use this photo. Try a different one of yourself or your pet.",
  violence: "We can't use this photo. Try a different one of yourself or your pet.",
  too_many: "Try a photo with up to 3 people or pets.",
};

/** The allow/block decision lives in code. We never trust a model-provided "allowed" boolean. */
export function decide(g: SafetyGate): { allowed: true } | { allowed: false; code: BlockCode } {
  if (g.subject_type === "none" || g.subject_count < 1) return { allowed: false, code: "no_subject" };
  if (g.nsfw_or_suggestive) return { allowed: false, code: "nsfw" };
  if (g.violence_or_gore) return { allowed: false, code: "violence" };
  // Crowds first: "try fewer people" is the actionable message, and the photo is blocked either way.
  if (g.subject_count > 3) return { allowed: false, code: "too_many" };
  // "When unsure, true" makes the model flag pet-only photos too, so only trust the flag when people are present.
  // A person subject always counts as people present, whatever people_count says.
  const hasPeople = g.subject_type === "person" || g.people_count === undefined || g.people_count > 0;
  if (g.likely_minor && hasPeople) return { allowed: false, code: "minor" };
  if (g.public_figure_likely) return { allowed: false, code: "public_figure" };
  return { allowed: true };
}

export async function analyzePhoto(image: string, fault: string | null) {
  const out = await generateJson(AnalyzeOutputSchema, {
    jsonSchema: ANALYZE_JSON,
    system: ANALYZE_SYSTEM,
    parts: [{ text: "Analyze this photo." }, imagePart(image)],
    temperature: 0.1,
    fakeResponses: fault === "gemini_malformed" ? ["{not json", '{"safety": "nope"}'] : undefined,
  });
  return { safety: out.safety, analysis: out.analysis ?? null, decision: decide(out.safety) };
}

// ---------- [3] ----------

export async function matchTemplates(analysis: Analysis, theme: Theme): Promise<{ template: MemeTemplate; reason: string }[]> {
  const candidates = filterTemplates(theme, analysis.subject_type);
  const byOverlap = tagOverlapRank(candidates, analysis);
  try {
    const ranked = await generateJson(RankOutputSchema, {
      jsonSchema: RANK_JSON,
      system: RANK_SYSTEM,
      parts: [{ text: rankPrompt(analysis, theme, candidates) }],
      temperature: 0.5,
      timeoutMs: 15_000,
    });
    const picks: { template: MemeTemplate; reason: string }[] = [];
    for (const p of ranked.picks) {
      const t = candidates.find((c) => c.id === p.template_id);
      if (t && !picks.some((x) => x.template.id === t.id)) picks.push({ template: t, reason: p.reason });
    }
    // Top up with tag-overlap picks if the model returned fewer than 3 valid ids.
    for (const t of byOverlap) {
      if (picks.length >= 3) break;
      if (!picks.some((x) => x.template.id === t.id)) picks.push({ template: t, reason: "Matches the mood of your photo" });
    }
    return picks.slice(0, 3);
  } catch {
    return byOverlap.slice(0, 3).map((t) => ({ template: t, reason: "Matches the mood of your photo" }));
  }
}

// ---------- [5] ----------

export type Verdict = { safe: boolean; category: ModCategory; layer: "blocklist" | "model" | "length" };

/** Two independent layers: local blocklist first, then a model classifier (batched). */
export async function moderateTexts(texts: string[]): Promise<Verdict[]> {
  const verdicts: (Verdict | null)[] = texts.map((t) => {
    const hit = checkBlocklist(t);
    return hit.blocked ? { safe: false, category: hit.category, layer: "blocklist" } : null;
  });
  const pending = texts.map((t, i) => ({ t, i })).filter(({ i }) => verdicts[i] === null);
  if (pending.length) {
    const out = await generateJson(ModerationBatchSchema, {
      jsonSchema: MODERATE_JSON,
      system: MODERATE_SYSTEM,
      parts: [{ text: moderatePrompt(pending.map((p) => p.t)) }],
      temperature: 0,
      timeoutMs: 15_000,
    });
    pending.forEach((p, j) => {
      const r = out.results.find((x) => x.index === j);
      // Missing verdict = not proven safe.
      verdicts[p.i] = r
        ? r.safe && r.category === "none"
          ? { safe: true, category: "none", layer: "model" }
          : { safe: false, category: r.category === "none" ? "harassment" : r.category, layer: "model" }
        : { safe: false, category: "harassment", layer: "model" };
    });
  }
  return verdicts as Verdict[];
}

// ---------- [4] + [5] ----------

const MAX_SLOT = 60;

function cleanSlots(t: MemeTemplate, slots: Slots): Slots | null {
  const out: Slots = {};
  for (const s of t.slots) {
    const v = (slots[s] ?? "").replace(/\s+/g, " ").trim();
    if (!v || v.length > MAX_SLOT) return null;
    out[s] = v;
  }
  return out;
}

/** Normalise the caption item shapes we accept into { top, bottom } for this template. */
function toSlots(t: MemeTemplate, c: CaptionItem): Slots {
  if (typeof c.slots === "string") return { [t.slots[0]]: c.slots };
  if (Array.isArray(c.slots)) {
    const arr = c.slots;
    return Object.fromEntries(t.slots.map((s, i) => [s, arr[i] ?? ""]));
  }
  return { top: c.slots?.top ?? c.top, bottom: c.slots?.bottom ?? c.bottom };
}

function fullText(t: MemeTemplate, slots: Slots) {
  return Object.values(renderLines(t, slots)).join(" / ");
}

async function writeFor(analysis: Analysis, theme: Theme, templates: MemeTemplate[], avoid?: string) {
  const out = await generateJson(CaptionOutputSchema, {
    jsonSchema: CAPTION_JSON,
    system: CAPTION_SYSTEM,
    parts: [{ text: captionPrompt(analysis, theme, templates, avoid) }],
    temperature: 0.9,
  });
  return templates.map((t) => {
    const c = out.captions.find((x) => x.template_id === t.id);
    return c ? cleanSlots(t, toSlots(t, c)) : null;
  });
}

export async function writeCaptions(
  analysis: Analysis,
  theme: Theme,
  picks: { template: MemeTemplate; reason: string }[],
): Promise<{ options: CaptionOption[]; dropped: number; fallbacks: number }> {
  const templates = picks.map((p) => p.template);
  let slots = await writeFor(analysis, theme, templates);
  let dropped = 0;

  const check = async (list: (Slots | null)[]) => {
    const idx = list.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
    const verdicts = await moderateTexts(idx.map((i) => fullText(templates[i], list[i]!)));
    const result = [...list];
    const reasons: string[] = [];
    idx.forEach((i, j) => {
      if (!verdicts[j].safe) {
        result[i] = null;
        dropped++;
        reasons.push(verdicts[j].category);
      }
    });
    return { result, reasons };
  };

  const first = await check(slots);
  let result = first.result;
  const reasons = first.reasons;

  // Regenerate once for any that were missing, too long, or unsafe.
  const failed = result.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
  if (failed.length) {
    try {
      const retry = await writeFor(analysis, theme, failed.map((i) => templates[i]), reasons.join(", ") || "too long or missing");
      const merged = [...result];
      failed.forEach((i, j) => (merged[i] = retry[j]));
      ({ result } = await check(merged));
    } catch {
      // fall through to safe_fallback
    }
  }

  let fallbacks = 0;
  slots = result.map((s, i) => {
    if (s) return s;
    fallbacks++;
    return templates[i].safe_fallback;
  });

  return {
    options: picks.map((p, i) => ({ template: publicTemplate(p.template), slots: slots[i]!, reason: p.reason })),
    dropped,
    fallbacks,
  };
}

export function templatesFromIds(ids: string[], theme: Theme) {
  return ids
    .map((id) => getTemplate(id))
    .filter((t): t is MemeTemplate => !!t && t.themes.includes(theme))
    .map((t) => ({ template: t, reason: "" }));
}
