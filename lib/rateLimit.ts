// In-memory sliding-window rate limit. Resets on redeploy/cold start (documented in README).
// Good enough to stop casual cost abuse on a hackathon deployment.

const WINDOW_MS = 60 * 60 * 1000;
const buckets = new Map<string, number[]>();

export const LIMITS = {
  generation: 10, // stickers made per IP per hour (counted on /api/captions)
  analyze: 25, // photo checks (includes blocked photos and retries)
  stylize: 12, // image-model calls, the expensive one
  moderate: 60, // caption edits
} as const;

export type Bucket = keyof typeof LIMITS;

export function rateLimit(ip: string, bucket: Bucket, now = Date.now()): { ok: true } | { ok: false; retryAfterSec: number } {
  const key = `${bucket}:${ip}`;
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= LIMITS[bucket]) {
    buckets.set(key, hits);
    return { ok: false, retryAfterSec: Math.ceil((WINDOW_MS - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  // Opportunistic cleanup so the map can't grow forever.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < WINDOW_MS)) buckets.delete(k);
  }
  return { ok: true };
}

export function _resetRateLimits() {
  buckets.clear();
}
