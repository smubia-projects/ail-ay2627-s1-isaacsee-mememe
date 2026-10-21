import "server-only";
import type { z } from "zod";
import { AiError } from "./llm";
import { rateLimit, type Bucket } from "./rateLimit";

const MAX_BODY_BYTES = 4 * 1024 * 1024;

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "local").trim();
}

export function enforceRate(req: Request, bucket: Bucket) {
  const r = rateLimit(clientIp(req), bucket);
  if (!r.ok) {
    const msg =
      bucket === "generation"
        ? "You've made 10 stickers this hour. Come back in a bit."
        : "That's a lot of requests in one hour. Come back in a bit.";
    throw new HttpError(429, "rate_limited", msg);
  }
}

/** Read + size-check + zod-validate a JSON body. */
export async function readJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BODY_BYTES) throw new HttpError(413, "too_large", "That photo is too big. Try a smaller one.");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "too_large", "That photo is too big. Try a smaller one.");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, "bad_request", "Something was wrong with that request. Refresh and try again.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "bad_request", "Something was wrong with that request. Refresh and try again.");
  return parsed.data;
}

/** Metadata-only logging. Never log images, captions typed by users, or analysis text. */
export function logEvent(route: string, data: Record<string, string | number | boolean | undefined>) {
  console.log(JSON.stringify({ route, ...data }));
}

/** Wrap a route handler: consistent errors, latency logging, never a stack trace to the client. */
export function handler(route: string, fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    const t0 = Date.now();
    try {
      const res = await fn(req);
      logEvent(route, { status: res.status, ms: Date.now() - t0 });
      return res;
    } catch (e) {
      let status = 500;
      let code = "server_error";
      let message = "Something went wrong on our side. Try again in a moment.";
      if (e instanceof HttpError) {
        ({ status, code, message } = e);
      } else if (e instanceof AiError) {
        status = e.kind === "config" ? 503 : 502;
        code = `ai_${e.kind}`;
        message =
          e.kind === "timeout"
            ? "The AI took too long to answer. Try again."
            : e.kind === "config"
              ? "The AI isn't set up on this server yet."
              : e.kind === "upstream"
                ? "The AI service is busy right now. Try again in a moment."
                : "The AI gave us a garbled answer. Try again.";
      }
      logEvent(route, { status, code, ms: Date.now() - t0, err: e instanceof Error ? e.message.slice(0, 160) : "unknown" });
      return Response.json({ error: { code, message } }, { status });
    }
  };
}
