import { moderateTexts } from "@/lib/pipeline";
import { ModerateRequest } from "@/lib/schemas";
import { handler, logEvent, parseBody } from "../http";

/** POST /api/moderate — [5] re-moderates user-edited captions with the same two layers as generated ones. */
export const moderateHandler = handler("moderate", async (req) => {
  const { text } = parseBody(req, ModerateRequest);
  if (!text.trim()) return { safe: true, category: "none" };
  if (text.length > 200) return { safe: false, category: "too_long" };
  const [v] = await moderateTexts([text]);
  logEvent("moderate.verdict", { safe: v.safe, category: v.category, layer: v.layer });
  return { safe: v.safe, category: v.category, layer: v.layer };
});
