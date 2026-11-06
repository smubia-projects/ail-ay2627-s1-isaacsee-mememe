import { matchTemplates, templatesFromIds, writeCaptions } from "@/lib/pipeline";
import { CaptionsRequest } from "@/lib/schemas";
import { handler, logEvent, parseBody } from "../http";

/**
 * POST /api/captions — [4] caption writer + [5] moderator. Every option returned has passed both
 * moderation layers (or is the template's hand-written safe_fallback).
 */
export const captionsHandler = handler("captions", async (req) => {
  const { analysis, theme, templateIds } = parseBody(req, CaptionsRequest);
  let picks = templateIds?.length ? templatesFromIds(templateIds, theme) : [];
  if (picks.length === 0) picks = await matchTemplates(analysis, theme);
  const { options, dropped, fallbacks } = await writeCaptions(analysis, theme, picks);
  logEvent("captions.moderation", { theme, dropped, fallbacks });
  return { options };
});
