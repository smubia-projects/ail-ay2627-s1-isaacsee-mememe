import cors from "cors";
import express from "express";
import { MAX_BODY, errorHandler } from "./http";
import { limitAnalyze, limitGeneration, limitMatch, limitModerate, limitStylize } from "./rateLimit";
import { analyzeHandler } from "./routes/analyze";
import { captionsHandler } from "./routes/captions";
import { matchHandler } from "./routes/match";
import { moderateHandler } from "./routes/moderate";
import { stylizeHandler } from "./routes/stylize";

/**
 * MemeMe API (Cloud Run). API-only: the Next.js frontend is deployed separately on Vercel
 * and calls these routes via NEXT_PUBLIC_API_BASE. Pipeline steps as numbered in README §4.
 *
 *   GET  /api/health    -> {"status":"ok"}
 *   POST /api/analyze   -> [1] safety gate + [2] subject analyzer      [rate limited: analyze]
 *   POST /api/match     -> [3] template matcher                       [rate limited: match]
 *   POST /api/captions  -> [4] caption writer + [5] moderator         [rate limited: generation]
 *   POST /api/moderate  -> [5] re-moderates a user-edited caption     [rate limited: moderate]
 *   POST /api/stylize   -> [6] sticker stylizer (image model)         [rate limited: stylize]
 */

const app = express();
app.set("trust proxy", true);
app.disable("x-powered-by");

const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    // No CORS_ORIGINS set (local dev) -> allow any origin. Otherwise only the listed ones.
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)),
  }),
);

// Photos arrive as base64 data URLs (resized client-side to 1024px JPEG), well under this cap.
const json = express.json({ limit: MAX_BODY });

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// The limiter runs before the body parser, so an over-limit request is rejected without reading the photo.
app.post("/api/analyze", limitAnalyze, json, analyzeHandler);
app.post("/api/match", limitMatch, json, matchHandler);
app.post("/api/captions", limitGeneration, json, captionsHandler);
app.post("/api/moderate", limitModerate, json, moderateHandler);
app.post("/api/stylize", limitStylize, json, stylizeHandler);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "not_found", message: "Not found. This is the MemeMe API; the app itself is on the frontend." } });
});
app.use(errorHandler);

const port = Number(process.env.PORT) || 8080;
app.listen(port, "0.0.0.0", (err?: Error) => {
  // Express 5 passes listen errors (e.g. EADDRINUSE) here instead of throwing.
  if (err) {
    console.error(`MemeMe API failed to listen on 0.0.0.0:${port}:`, err.message);
    process.exit(1);
  }
  console.log(`MemeMe API listening on 0.0.0.0:${port}`);
});
