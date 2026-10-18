import { enforceRate, handler, logEvent, readJson } from "@/lib/http";
import { moderateTexts } from "@/lib/pipeline";
import { ModerateRequest } from "@/lib/schemas";

// [5] Re-moderates user-edited captions with the same two layers as generated ones.
export const POST = handler("moderate", async (req) => {
  enforceRate(req, "moderate");
  const { text } = await readJson(req, ModerateRequest);
  if (!text.trim()) return Response.json({ safe: true, category: "none" });
  if (text.length > 200) return Response.json({ safe: false, category: "too_long" });
  const [v] = await moderateTexts([text]);
  logEvent("moderate.verdict", { safe: v.safe, category: v.category, layer: v.layer });
  return Response.json({ safe: v.safe, category: v.category, layer: v.layer });
});
