import cors from "cors";
import express from "express";
import { MAX_BODY, errorHandler } from "./http";
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
 *   POST /api/analyze   -> [1] safety gate + [2] subject analyzer
 *   POST /api/match     -> [3] template matcher
 *   POST /api/captions  -> [4] caption writer + [5] moderator
 *   POST /api/moderate  -> [5] re-moderates a user-edited caption
 *   POST /api/stylize   -> [6] sticker stylizer (image model)
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

app.post("/api/analyze", json, analyzeHandler);
app.post("/api/match", json, matchHandler);
app.post("/api/captions", json, captionsHandler);
app.post("/api/moderate", json, moderateHandler);
app.post("/api/stylize", json, stylizeHandler);

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
