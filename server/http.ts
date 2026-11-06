import type { ErrorRequestHandler, Request, RequestHandler, Response } from "express";
import type { z } from "zod";
import { AiError } from "@/lib/llm";

/** Max JSON body: a 1024px JPEG data URL (lib/image/resize.ts) plus the analysis fits well under this. */
export const MAX_BODY = "4mb";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const BAD_REQUEST = "Something was wrong with that request. Refresh and try again.";
const TOO_LARGE = "That photo is too big. Try a smaller one.";

/** zod-validate an already-parsed JSON body. */
export function parseBody<T extends z.ZodType>(req: Request, schema: T): z.infer<T> {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "bad_request", BAD_REQUEST);
  return parsed.data;
}

/** Metadata-only logging. Never log images, captions typed by users, or analysis text. */
export function logEvent(route: string, data: Record<string, string | number | boolean | undefined>) {
  console.log(JSON.stringify({ route, ...data }));
}

/** Map any thrown error to a status + user-facing message. Never a stack trace to the client. */
function toResponse(e: unknown): { status: number; code: string; message: string } {
  if (e instanceof HttpError) return { status: e.status, code: e.code, message: e.message };
  // body-parser errors (oversized or malformed JSON)
  const type = (e as { type?: string } | null)?.type;
  if (type === "entity.too.large") return { status: 413, code: "too_large", message: TOO_LARGE };
  if (type === "entity.parse.failed") return { status: 400, code: "bad_request", message: BAD_REQUEST };
  if (e instanceof AiError) {
    return {
      // 500 rather than 503: 503 is reserved for the rate-limit kill switch ("demo paused").
      status: e.kind === "config" ? 500 : 502,
      code: `ai_${e.kind}`,
      message:
        e.kind === "timeout"
          ? "The AI took too long to answer. Try again."
          : e.kind === "config"
            ? "The AI isn't set up on this server yet."
            : e.kind === "upstream"
              ? "The AI service is busy right now. Try again in a moment."
              : "The AI gave us a garbled answer. Try again.",
    };
  }
  return { status: 500, code: "server_error", message: "Something went wrong on our side. Try again in a moment." };
}

/** Wrap a route handler: JSON result, consistent errors, latency logging. */
export function handler(route: string, fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return async (req, res) => {
    const t0 = Date.now();
    try {
      const body = await fn(req, res);
      res.json(body);
      logEvent(route, { status: res.statusCode, ms: Date.now() - t0 });
    } catch (e) {
      const { status, code, message } = toResponse(e);
      logEvent(route, { status, code, ms: Date.now() - t0, err: e instanceof Error ? e.message.slice(0, 160) : "unknown" });
      res.status(status).json({ error: { code, message } });
    }
  };
}

/** Final error handler for errors raised by middleware (e.g. the JSON body parser). */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const { status, code, message } = toResponse(err);
  logEvent(req.path, { status, code, err: err instanceof Error ? err.message.slice(0, 160) : "unknown" });
  res.status(status).json({ error: { code, message } });
};
