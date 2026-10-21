import { OPENROUTER_MODEL, stylizeImage } from "@/lib/openrouter";
import { evalFault } from "@/lib/pipeline";
import { stylePrompt } from "@/lib/prompts";
import { StylizeRequest } from "@/lib/schemas";
import { handler, logEvent, parseBody } from "../http";

/**
 * POST /api/stylize — [6] sticker stylizer via the OpenRouter image model.
 * Any failure → { fallback: true } and the client uses the original photo.
 */
export const stylizeHandler = handler("stylize", async (req) => {
  const { image, style, analysis } = parseBody(req, StylizeRequest);
  if (style === "photo") return { fallback: true, reason: "keep_photo" };

  const t0 = Date.now();
  const result =
    evalFault(req.get("x-mememe-eval")) === "openrouter_fail"
      ? ({ ok: false, reason: "eval_injected" } as const)
      : await stylizeImage(stylePrompt(style, analysis), image);
  logEvent("stylize.model", { model: OPENROUTER_MODEL, style, ok: result.ok, reason: result.ok ? undefined : result.reason, ms: Date.now() - t0 });

  return result.ok ? { image: result.image } : { fallback: true, reason: result.reason };
});
