import { enforceRate, handler, logEvent, readJson } from "@/lib/http";
import { OPENROUTER_MODEL, stylizeImage } from "@/lib/openrouter";
import { evalFault } from "@/lib/pipeline";
import { stylePrompt } from "@/lib/prompts";
import { StylizeRequest } from "@/lib/schemas";

export const maxDuration = 60;

// [6] Sticker stylizer via OpenRouter. Any failure → { fallback: true } and the client uses the photo.
export const POST = handler("stylize", async (req) => {
  enforceRate(req, "stylize");
  const { image, style, analysis } = await readJson(req, StylizeRequest);
  if (style === "photo") return Response.json({ fallback: true, reason: "keep_photo" });

  const t0 = Date.now();
  const result =
    evalFault(req) === "openrouter_fail"
      ? ({ ok: false, reason: "eval_injected" } as const)
      : await stylizeImage(stylePrompt(style, analysis), image);
  logEvent("stylize.model", { model: OPENROUTER_MODEL, style, ok: result.ok, reason: result.ok ? undefined : result.reason, ms: Date.now() - t0 });

  return result.ok ? Response.json({ image: result.image }) : Response.json({ fallback: true, reason: result.reason });
});
