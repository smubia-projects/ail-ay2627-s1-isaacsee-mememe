import { describe, expect, it } from "vitest";
import { boundingBox, buildBackgroundMask, cutLooksValid, dilateAlpha, removeSpecks } from "@/lib/canvas/diecut";

function image(w: number, h: number, paint: (x: number, y: number) => [number, number, number]) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = paint(x, y);
      const o = (y * w + x) * 4;
      d.set([r, g, b, 255], o);
    }
  return d;
}

describe("die-cut mask", () => {
  const W = 40;
  // White background, red disc of radius 10 in the centre, with a white "eye" inside it.
  const disc = image(W, W, (x, y) => {
    const r = Math.hypot(x - 20, y - 20);
    if (r < 2) return [255, 255, 255];
    return r < 10 ? [220, 40, 60] : [250, 250, 248];
  });

  it("removes the near-white background connected to the edges only", () => {
    const { bg, removedRatio } = buildBackgroundMask(disc, W, W);
    expect(bg[0]).toBe(1);
    expect(bg[20 * W + 20]).toBe(0); // interior white "eye" is kept
    expect(bg[20 * W + 25]).toBe(0);
    expect(removedRatio).toBeGreaterThan(0.7);
    expect(removedRatio).toBeLessThan(0.9);
    expect(cutLooksValid(removedRatio)).toBe(true);
  });

  it("refuses to cut a busy photo with no plain background", () => {
    const busy = image(W, W, (x, y) => [(x * 37) % 200, (y * 53) % 200, 90]);
    const { removedRatio } = buildBackgroundMask(busy, W, W);
    expect(cutLooksValid(removedRatio)).toBe(false);
  });

  it("dilates the silhouette by roughly the outline radius", () => {
    const { bg } = buildBackgroundMask(disc, W, W);
    const subject = bg.map((v) => (v ? 0 : 1));
    const alpha = dilateAlpha(subject, W, W, 5);
    expect(alpha[20 * W + (20 + 13)]).toBe(255); // inside radius 10 + 5
    expect(alpha[20 * W + (20 + 17)]).toBe(0); // well outside
    const bb = boundingBox(subject, W, W)!;
    expect(bb.w).toBeGreaterThanOrEqual(17);
    expect(bb.w).toBeLessThanOrEqual(20);
  });

  it("drops background specks but keeps a second real subject", () => {
    const w = 60;
    const m = new Uint8Array(w * w);
    const blob = (cx: number, cy: number, r: number) => {
      for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) if (Math.hypot(x - cx, y - cy) < r) m[y * w + x] = 1;
    };
    blob(20, 30, 12); // main pet
    blob(46, 30, 7); // second pet
    m[2 * w + 2] = 1; // noise speck
    m[57 * w + 55] = 1;
    removeSpecks(m, w, w);
    expect(m[2 * w + 2]).toBe(0);
    expect(m[57 * w + 55]).toBe(0);
    expect(m[30 * w + 20]).toBe(1);
    expect(m[30 * w + 46]).toBe(1);
  });
});
