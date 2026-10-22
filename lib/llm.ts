import "server-only";
import type { z } from "zod";
import { OPENROUTER_CHAT_URL, openRouterHeaders } from "./openrouter";

/** Vision + JSON model for the safety gate, analysis, ranking, captions and moderation. */
export const TEXT_MODEL = (process.env.MODEL_NAME || process.env.OPENROUTER_TEXT_MODEL) || "google/gemini-3.5-flash-lite";

export class AiError extends Error {
  constructor(
    public kind: "config" | "upstream" | "parse" | "timeout",
    message: string,
  ) {
    super(message);
  }
}

/** A prompt part: plain text, or an image as a data URL (see imagePart). */
export type Part = { text: string } | { image_url: { url: string } };

/** Validate a data URL and wrap it as an image part. */
export function imagePart(dataUrl: string): Part {
  if (!/^data:image\/[a-z]+;base64,.+$/.test(dataUrl)) throw new AiError("parse", "bad image data URL");
  return { image_url: { url: dataUrl } };
}

/** Map our parts to OpenAI-style chat content parts. */
export function toContent(parts: Part[]) {
  return parts.map((p) => ("text" in p ? { type: "text", text: p.text } : { type: "image_url", image_url: { url: p.image_url.url } }));
}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");
  return JSON.parse(cleaned);
}

class UpstreamStatus extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

async function chatJson(opts: { system: string; parts: Part[]; jsonSchema?: unknown; temperature?: number; signal: AbortSignal }) {
  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    signal: opts.signal,
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: TEXT_MODEL,
      temperature: opts.temperature ?? 0.4,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: toContent(opts.parts) },
      ],
      // Constrained decoding where the provider supports it; zod still validates every response.
      response_format: opts.jsonSchema
        ? { type: "json_schema", json_schema: { name: "response", strict: false, schema: opts.jsonSchema } }
        : { type: "json_object" },
    }),
  });
  if (!res.ok) throw new UpstreamStatus(res.status);
  const json = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((c) => (c && typeof c === "object" && "text" in c ? String((c as { text: unknown }).text) : "")).join("");
  }
  return "";
}

/**
 * Call the text/vision model in JSON mode via OpenRouter and validate with zod.
 * On a parse/validation failure, retry once, then throw AiError("parse").
 * `fakeResponses` lets the safety eval inject malformed output (case 10).
 */
export async function generateJson<T extends z.ZodType>(
  schema: T,
  opts: {
    system: string;
    parts: Part[];
    /** JSON Schema for constrained decoding (see lib/jsonSchemas.ts). */
    jsonSchema?: unknown;
    temperature?: number;
    timeoutMs?: number;
    fakeResponses?: string[];
  },
): Promise<z.infer<T>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    if (opts.fakeResponses) {
      text = opts.fakeResponses[attempt] ?? "";
    } else {
      if (!(process.env.API_KEY || process.env.OPENROUTER_API_KEY)) throw new AiError("config", "OPENROUTER_API_KEY is not set");
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? 25_000);
      try {
        text = await chatJson({ ...opts, signal: ac.signal });
      } catch (e) {
        if (ac.signal.aborted) throw new AiError("timeout", "Model request timed out");
        lastErr = e;
        const status = e instanceof UpstreamStatus ? e.status : undefined;
        // Network/429/5xx: worth exactly one retry, after a short pause for rate limits.
        if (attempt === 0) {
          if (status === 429 || status === 503) await new Promise((r) => setTimeout(r, 2500));
          continue;
        }
        throw new AiError("upstream", `OpenRouter request failed (${status ?? "network"}): ${String((e as Error)?.message ?? e).slice(0, 160)}`);
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
  throw new AiError("parse", `Model returned invalid JSON twice: ${String(lastErr).slice(0, 200)}`);
}
