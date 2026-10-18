import "server-only";
import { GoogleGenAI, type Part } from "@google/genai";
import type { z } from "zod";

export const GEMINI_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";

let client: GoogleGenAI | null = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new AiError("config", "GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export class AiError extends Error {
  constructor(
    public kind: "config" | "upstream" | "parse" | "timeout",
    message: string,
  ) {
    super(message);
  }
}

/** Turn a data URL into a Gemini inline image part. */
export function imagePart(dataUrl: string): Part {
  const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new AiError("parse", "bad image data URL");
  return { inlineData: { mimeType: m[1], data: m[2] } };
}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");
  return JSON.parse(cleaned);
}

/**
 * Call Gemini in JSON mode and validate with zod.
 * On a parse/validation failure, retry once, then throw AiError("parse").
 * `fakeResponses` lets the safety eval inject malformed output (case 10).
 */
export async function generateJson<T extends z.ZodType>(
  schema: T,
  opts: { system: string; parts: Part[]; temperature?: number; timeoutMs?: number; fakeResponses?: string[] },
): Promise<z.infer<T>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    if (opts.fakeResponses) {
      text = opts.fakeResponses[attempt] ?? "";
    } else {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? 25_000);
      try {
        const res = await getClient().models.generateContent({
          model: GEMINI_MODEL,
          contents: [{ role: "user", parts: opts.parts }],
          config: {
            systemInstruction: opts.system,
            responseMimeType: "application/json",
            temperature: opts.temperature ?? 0.4,
            abortSignal: ac.signal,
          },
        });
        text = res.text ?? "";
      } catch (e) {
        if (ac.signal.aborted) throw new AiError("timeout", "Gemini timed out");
        if (e instanceof AiError) throw e;
        lastErr = e;
        // Network/5xx: worth exactly one retry too.
        if (attempt === 0) continue;
        throw new AiError("upstream", "Gemini request failed");
      } finally {
        clearTimeout(timer);
      }
    }
    try {
      return schema.parse(extractJson(text));
    } catch (e) {
      lastErr = e;
    }
  }
  throw new AiError("parse", `Gemini returned invalid JSON twice: ${String(lastErr).slice(0, 200)}`);
}
