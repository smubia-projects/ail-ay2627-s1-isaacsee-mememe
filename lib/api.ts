// Client-side fetch helper. Every error carries a user-facing message (what happened + what to do).
//
// The API runs on Cloud Run while this frontend is served from Vercel, so every call is prefixed with
// NEXT_PUBLIC_API_BASE (the Cloud Run URL; http://localhost:8080 in local dev).
//
// It also watches for the shared rate-limit engine's responses:
//  - 429 (limit hit)          -> dispatches `mememe:rate-limit` with queries_used  -> RateLimitCTA modal
//  - 503 with a paused body   -> dispatches `mememe:demo-paused` with the message -> DemoPausedNotice
// components/ApiNotices.tsx listens for these and renders the modal / notice. The thrown ApiError has
// `handled = true`, so callers skip their generic error UI.

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080").replace(/\/$/, "");

export const RATE_LIMIT_EVENT = "mememe:rate-limit";
export const DEMO_PAUSED_EVENT = "mememe:demo-paused";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
    /** True when a 429 CTA or 503 paused notice was already shown for this error. */
    public handled = false,
  ) {
    super(message);
  }
}

type ErrorBody = {
  error?: { code?: string; message?: string };
  message?: string;
  queries_used?: number;
  detail?: { message?: string; queries_used?: number };
} | null;

export async function postJson<T>(path: string, body: unknown, timeoutMs = 60_000): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
  } catch {
    throw ac.signal.aborted
      ? new ApiError("timeout", "That took too long. Check your connection and try again.")
      : new ApiError("network", "We couldn't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // handled below
  }
  if (!res.ok) {
    const b = json as ErrorBody;
    if (res.status === 429) {
      const queriesUsed = b?.queries_used ?? b?.detail?.queries_used ?? 0;
      window.dispatchEvent(new CustomEvent(RATE_LIMIT_EVENT, { detail: { queriesUsed } }));
      throw new ApiError("rate_limited", "You've reached this demo's limit.", 429, true);
    }
    const pausedMsg = b?.message ?? b?.detail?.message;
    if (res.status === 503 && pausedMsg && /paused/i.test(pausedMsg)) {
      window.dispatchEvent(new CustomEvent(DEMO_PAUSED_EVENT, { detail: { message: pausedMsg } }));
      throw new ApiError("paused", pausedMsg, 503, true);
    }
    const err = b?.error;
    throw new ApiError(err?.code ?? `http_${res.status}`, err?.message ?? "Something went wrong. Try again in a moment.", res.status);
  }
  return json as T;
}
