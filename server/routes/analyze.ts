import { BLOCK_MESSAGES, analyzePhoto, evalFault } from "@/lib/pipeline";
import { AnalyzeRequest } from "@/lib/schemas";
import { handler, logEvent, parseBody } from "../http";

/**
 * POST /api/analyze — [1] safety gate + [2] subject analyzer. JSON: { image } (data URL).
 * The allow/block decision (minors, public figures, explicit/violent content, crowds) is made in
 * code here, before any analysis is returned; generation routes only ever receive an allowed analysis.
 * The image is only held in memory for this request.
 */
export const analyzeHandler = handler("analyze", async (req) => {
  const { image } = parseBody(req, AnalyzeRequest);
  const { safety, analysis, decision } = await analyzePhoto(image, evalFault(req.get("x-mememe-eval")));

  logEvent("analyze.gate", {
    subject: safety.subject_type,
    count: safety.subject_count,
    block: decision.allowed ? undefined : decision.code,
    text_instructions: safety.contains_text_instructions,
  });

  if (!decision.allowed) return { allowed: false, blockCode: decision.code, blockReason: BLOCK_MESSAGES[decision.code] };
  if (!analysis) return { allowed: false, blockCode: "no_subject", blockReason: BLOCK_MESSAGES.no_subject };
  return { allowed: true, analysis, flags: { textInstructions: safety.contains_text_instructions } };
});
