import { enforceRate, handler, logEvent, readJson } from "@/lib/http";
import { matchTemplates, templatesFromIds, writeCaptions } from "@/lib/pipeline";
import { CaptionsRequest } from "@/lib/schemas";

export const maxDuration = 60;

// [4] Caption writer + [5] moderator. Every option returned has passed both moderation layers
// (or is the template's hand-written safe_fallback).
export const POST = handler("captions", async (req) => {
  enforceRate(req, "generation");
  const { analysis, theme, templateIds } = await readJson(req, CaptionsRequest);
  let picks = templateIds?.length ? templatesFromIds(templateIds, theme) : [];
  if (picks.length === 0) picks = await matchTemplates(analysis, theme);
  const { options, dropped, fallbacks } = await writeCaptions(analysis, theme, picks);
  logEvent("captions.moderation", { theme, dropped, fallbacks });
  return Response.json({ options });
});
