import { createRateLimiter } from "./rateLimitEngine.js";

/**
 * Rate-limit adapter: the shared engine (rateLimitEngine.js) with this project's
 * slug and one bucket per LLM action. The engine handles X-Forwarded-For, central
 * config from the control sheet, event mode, the kill switch (503) and fail-open.
 * Without Upstash credentials it is a no-op, which is what local dev wants.
 */
const limiter = createRateLimiter({
  // Slug = full project folder name (matches the central control-sheet rows).
  project: "ail-ay2627-s1-isaacsee-mememe",
  buckets: {
    analyze: Number(process.env.RATE_LIMIT_ANALYZE_MAX || 5), // photo safety check + analysis
    match: Number(process.env.RATE_LIMIT_MATCH_MAX || 5), // meme-template ranking
    generation: Number(process.env.RATE_LIMIT_GENERATION_MAX || 5), // caption writing (one per sticker)
    stylize: Number(process.env.RATE_LIMIT_STYLIZE_MAX || 5), // image-model call, the expensive one
    moderate: Number(process.env.RATE_LIMIT_MODERATE_MAX || 5), // re-checks of user-edited captions
  },
  redisUrl: process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL,
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN,
  defaultWindow: Number(process.env.RATE_LIMIT_WINDOW_SECONDS || 432000),
});

export const limitAnalyze = limiter("analyze");
export const limitMatch = limiter("match");
export const limitGeneration = limiter("generation");
export const limitStylize = limiter("stylize");
export const limitModerate = limiter("moderate");
