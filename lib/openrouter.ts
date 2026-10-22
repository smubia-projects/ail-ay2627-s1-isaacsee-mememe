import "server-only";
import { z } from "zod";

/** Image-output model for the sticker stylizer (must also accept image input). */
export const OPENROUTER_MODEL = (process.env.IMAGE_MODEL_NAME || process.env.OPENROUTER_IMAGE_MODEL) || "google/gemini-3.1-flash-image";

export const OPENROUTER_CHAT_URL = `${((process.env.API_BASE_URL || process.env.OPENROUTER_BASE_URL)?.trim() || "https://openrouter.ai/api/v1").replace(/\/+$/, "")}/chat/completions`;

/** Shared headers for every OpenRouter call (text/vision JSON in lib/llm.ts and images here). */
export function openRouterHeaders() {
  return {
    Authorization: `Bearer ${(process.env.API_KEY || process.env.OPENROUTER_API_KEY)}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
    "X-Title": "MemeMe",
  };
}

const DataUrl = z.string().regex(/^data:image\/(png|jpeg|jpg|webp);base64,/);
const ImageEntry = z.object({ image_url: z.object({ url: z.string() }) });

// Parse defensively: providers put generated images in slightly different places.
const ResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z
          .object({
            images: z.array(ImageEntry).optional(),
            content: z.union([z.string(), z.array(z.object({ type: z.string() }).loose()), z.null()]).optional(),
          })
          .loose(),
      }),
    )
    .min(1),
});

export type StylizeResult = { ok: true; image: string } | { ok: false; reason: string };

export function extractImage(json: unknown): string | null {
  const parsed = ResponseSchema.safeParse(json);
  if (!parsed.success) return null;
  const msg = parsed.data.choices[0].message;
  for (const img of msg.images ?? []) {
    if (DataUrl.safeParse(img.image_url.url).success) return img.image_url.url;
  }
  if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      const p = ImageEntry.safeParse(part);
      if (p.success && DataUrl.safeParse(p.data.image_url.url).success) return p.data.image_url.url;
    }
  }
  return null;
}

export async function stylizeImage(prompt: string, imageDataUrl: string, timeoutMs = 40_000): Promise<StylizeResult> {
  if (!(process.env.API_KEY || process.env.OPENROUTER_API_KEY)) return { ok: false, reason: "no_key" };
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      signal: ac.signal,
      headers: openRouterHeaders(),
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        modalities: ["image", "text"],
        image_config: { aspect_ratio: "1:1" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    const image = extractImage(await res.json());
    return image ? { ok: true, image } : { ok: false, reason: "no_image" };
  } catch {
    return { ok: false, reason: ac.signal.aborted ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}
