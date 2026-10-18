import { handler, readJson } from "@/lib/http";
import { matchTemplates } from "@/lib/pipeline";
import { MatchRequest } from "@/lib/schemas";
import { publicTemplate } from "@/lib/templates";

export const maxDuration = 30;

// [3] Template matcher: code filter over the dataset, then Gemini ranking (tag-overlap fallback).
export const POST = handler("match", async (req) => {
  const { analysis, theme } = await readJson(req, MatchRequest);
  const picks = await matchTemplates(analysis, theme);
  return Response.json({ picks: picks.map((p) => ({ template: publicTemplate(p.template), reason: p.reason })) });
});
