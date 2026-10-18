import { enforceRate, handler, logEvent, readJson } from "@/lib/http";
import { BLOCK_MESSAGES, analyzePhoto, evalFault } from "@/lib/pipeline";
import { AnalyzeRequest } from "@/lib/schemas";

export const maxDuration = 30;

// [1] Safety gate + [2] subject analyzer. The image is only held in memory for this request.
export const POST = handler("analyze", async (req) => {
  enforceRate(req, "analyze");
  const { image } = await readJson(req, AnalyzeRequest);
  const { safety, analysis, decision } = await analyzePhoto(image, evalFault(req));

  logEvent("analyze.gate", {
    subject: safety.subject_type,
    count: safety.subject_count,
    block: decision.allowed ? undefined : decision.code,
    text_instructions: safety.contains_text_instructions,
  });

  if (!decision.allowed) {
    return Response.json({ allowed: false, blockCode: decision.code, blockReason: BLOCK_MESSAGES[decision.code] });
  }
  if (!analysis) {
    return Response.json({ allowed: false, blockCode: "no_subject", blockReason: BLOCK_MESSAGES.no_subject });
  }
  return Response.json({ allowed: true, analysis, flags: { textInstructions: safety.contains_text_instructions } });
});
