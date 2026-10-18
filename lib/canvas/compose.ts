// [8] Compositor: sticker + caption + AI label on a 512×512 transparent canvas.
// All text is drawn here in code because image models render text badly.

import { THEME_FONT, type Theme } from "../options";
import type { SlotName } from "../schemas";

export const OUT = 512;
const PAD = 14;
const STROKE = 6;
const INK = "#1C1A3A";

function cssFamily(cssVar: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return v || fallback;
}

/** Make sure caption fonts are actually loaded before drawing, or canvas silently falls back. */
export async function ensureFonts(theme: Theme) {
  const f = THEME_FONT[theme];
  const family = cssFamily(f.cssVar, "sans-serif");
  const ui = cssFamily("--font-inter", "sans-serif");
  try {
    await Promise.all([document.fonts.load(`${f.weight} 40px ${family}`), document.fonts.load(`600 11px ${ui}`)]);
    await document.fonts.ready;
  } catch {
    // Draw with whatever we have rather than failing the sticker.
  }
}

type Fit = { lines: string[]; size: number; lineHeight: number };

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxW || !line) line = test;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, maxW: number, maxSize: number): Fit {
  for (let size = maxSize; size >= 18; size -= 2) {
    ctx.font = font(size);
    const lines = wrap(ctx, text, maxW);
    if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= maxW)) {
      return { lines, size, lineHeight: size * 1.08 };
    }
  }
  // Still too long at the minimum size: keep two lines and ellipsize.
  const size = 18;
  ctx.font = font(size);
  const lines = wrap(ctx, text, maxW).slice(0, 2);
  let last = lines[1] ?? lines[0];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
  lines[lines.length - 1] = `${last}…`;
  return { lines, size, lineHeight: size * 1.08 };
}

function drawLines(ctx: CanvasRenderingContext2D, fit: Fit, font: (px: number) => string, topY: number) {
  ctx.font = font(fit.size);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = STROKE;
  ctx.strokeStyle = INK;
  ctx.fillStyle = "#fff";
  fit.lines.forEach((line, i) => {
    const y = topY + i * fit.lineHeight;
    ctx.strokeText(line, OUT / 2, y);
    ctx.fillText(line, OUT / 2, y);
  });
}

function drawAiLabel(ctx: CanvasRenderingContext2D) {
  const ui = cssFamily("--font-inter", "sans-serif");
  ctx.font = `600 11px ${ui}`;
  const text = "AI-generated";
  const tw = ctx.measureText(text).width;
  const h = 20;
  const w = tw + 16;
  const x = OUT - w - 8;
  const y = OUT - h - 8;
  ctx.fillStyle = "rgba(28,26,58,0.78)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 8, y + h / 2 + 0.5);
}

const boundsCache = new WeakMap<HTMLCanvasElement, { x: number; y: number; w: number; h: number }>();

/** Bounding box of every non-transparent pixel, including the full soft shadow (cropping it leaves hard edges). */
function opaqueBounds(c: HTMLCanvasElement) {
  const cached = boundsCache.get(c);
  if (cached) return cached;
  const { width: w, height: h } = c;
  const data = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 1) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  const bb = maxX < 0 ? { x: 0, y: 0, w, h } : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  boundsCache.set(c, bb);
  return bb;
}

export function composeSticker(
  target: HTMLCanvasElement,
  sticker: HTMLCanvasElement,
  lines: Partial<Record<SlotName, string>>,
  theme: Theme,
) {
  target.width = OUT;
  target.height = OUT;
  const ctx = target.getContext("2d")!;
  ctx.clearRect(0, 0, OUT, OUT);

  const f = THEME_FONT[theme];
  const family = cssFamily(f.cssVar, "Impact, sans-serif");
  const font = (px: number) => `${f.weight} ${px}px ${family}`;
  const upper = f.cssVar === "--font-anton";
  const maxSize = upper ? 48 : 42;
  const maxW = OUT - PAD * 2 - STROKE;

  const prep = (t?: string) => (t ? (upper ? t.toUpperCase() : t) : "");
  const topText = prep(lines.top);
  const bottomText = prep(lines.bottom);
  const topFit = topText ? fitText(ctx, topText, font, maxW, maxSize) : null;
  const bottomFit = bottomText ? fitText(ctx, bottomText, font, maxW, maxSize) : null;

  // Fit the sticker's visible bounds (not its square canvas) so wide or tall subjects
  // sit right against their captions, then centre caption + sticker as one group.
  const bb = opaqueBounds(sticker);
  const textH = (fit: Fit | null) => (fit ? fit.lines.length * fit.lineHeight : 0);
  const overlap = 14; // captions slightly overlap the sticker edge, like a real meme sticker
  const gap = (fit: Fit | null) => (fit ? textH(fit) + 6 - overlap : 0);
  const labelRoom = 26;
  const availH = OUT - PAD * 2 - labelRoom - Math.max(0, gap(topFit)) - Math.max(0, gap(bottomFit));
  const availW = OUT - PAD * 2;
  const k = Math.min(availW / bb.w, availH / bb.h, 1.6);
  const dw = bb.w * k;
  const dh = bb.h * k;
  const groupH = Math.max(0, gap(topFit)) + dh + Math.max(0, gap(bottomFit));
  const top = PAD + (OUT - PAD * 2 - labelRoom - groupH) / 2;
  const sy = top + Math.max(0, gap(topFit));
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(sticker, bb.x, bb.y, bb.w, bb.h, (OUT - dw) / 2, sy, dw, dh);

  if (topFit) drawLines(ctx, topFit, font, top);
  if (bottomFit) drawLines(ctx, bottomFit, font, sy + dh - overlap + 6);
  drawAiLabel(ctx);
}

export function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), "image/png"));
}
