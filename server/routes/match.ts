import { matchTemplates } from "@/lib/pipeline";
import { MatchRequest } from "@/lib/schemas";
import { publicTemplate } from "@/lib/templates";
import { handler, parseBody } from "../http";

/** POST /api/match — [3] template matcher: code filter over the dataset, then model ranking (tag-overlap fallback). */
export const matchHandler = handler("match", async (req) => {
  const { analysis, theme } = parseBody(req, MatchRequest);
  const picks = await matchTemplates(analysis, theme);
  return { picks: picks.map((p) => ({ template: publicTemplate(p.template), reason: p.reason })) };
});
