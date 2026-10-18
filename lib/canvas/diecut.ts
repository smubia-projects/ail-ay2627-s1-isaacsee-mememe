// [7] Die-cut: remove the plain background, add a chunky white outline and a soft shadow.
// The mask maths is pure (testable in Node); the canvas helpers below run in the browser.

export const DIECUT = {
  tolerance: 30, // max per-channel distance from white that still counts as background
  minRemoved: 0.1,
  maxRemoved: 0.9,
  size: 512, // output sticker canvas
  outline: 12, // die-cut border thickness at output size
  margin: 18, // room for the drop shadow
};

/**
 * Flood-fill from every edge pixel through near-white (or transparent) pixels.
 * Returns bg[i] = 1 for removed background, plus the fraction removed.
 */
export function buildBackgroundMask(data: Uint8ClampedArray, w: number, h: number, tolerance = DIECUT.tolerance) {
  const n = w * h;
  const bg = new Uint8Array(n);
  const isBgColour = (i: number) => {
    const o = i * 4;
    if (data[o + 3] < 16) return true;
    return 255 - data[o] <= tolerance && 255 - data[o + 1] <= tolerance && 255 - data[o + 2] <= tolerance;
  };
  const stack = new Int32Array(n);
  let sp = 0;
  const push = (i: number) => {
    if (!bg[i] && isBgColour(i)) {
      bg[i] = 1;
      stack[sp++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < n - w) push(i + w);
  }
  let removed = 0;
  for (let i = 0; i < n; i++) removed += bg[i];
  return { bg, removedRatio: removed / n };
}

/**
 * Drop small islands of "subject" (background noise, paper texture, stray dots) so they don't get
 * dilated into white blobs. Keeps every component at least 4% the size of the largest one,
 * so a second pet or person survives. Mutates and returns `subject`.
 */
export function removeSpecks(subject: Uint8Array, w: number, h: number, minShareOfLargest = 0.04): Uint8Array {
  const n = w * h;
  const label = new Int32Array(n);
  const sizes: number[] = [0];
  const stack = new Int32Array(n);
  for (let start = 0; start < n; start++) {
    if (!subject[start] || label[start]) continue;
    const id = sizes.length;
    let sp = 0;
    let size = 0;
    label[start] = id;
    stack[sp++] = start;
    while (sp > 0) {
      const i = stack[--sp];
      size++;
      const x = i % w;
      const visit = (j: number) => {
        if (subject[j] && !label[j]) {
          label[j] = id;
          stack[sp++] = j;
        }
      };
      if (x > 0) visit(i - 1);
      if (x < w - 1) visit(i + 1);
      if (i >= w) visit(i - w);
      if (i < n - w) visit(i + w);
    }
    sizes.push(size);
  }
  const largest = Math.max(0, ...sizes);
  const keep = sizes.map((sz) => sz >= largest * minShareOfLargest);
  for (let i = 0; i < n; i++) if (subject[i] && !keep[label[i]]) subject[i] = 0;
  return subject;
}

/** The cut-out is only trustworthy if a sensible share of the image was removed. */
export function cutLooksValid(removedRatio: number) {
  return removedRatio >= DIECUT.minRemoved && removedRatio <= DIECUT.maxRemoved;
}

/**
 * Two-pass chamfer (3-4) distance transform from subject pixels.
 * Returns approximate Euclidean distance in pixels for every pixel.
 */
export function distanceFromSubject(subject: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = subject[i] ? 0 : INF;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - w] + 3);
        if (x > 0) v = Math.min(v, d[i - w - 1] + 4);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4);
      }
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + 3);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4);
        if (x > 0) v = Math.min(v, d[i + w - 1] + 4);
      }
      d[i] = v;
    }
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

/** Dilate a binary mask by radius r. Returns per-pixel alpha 0-255 with an anti-aliased edge. */
export function dilateAlpha(subject: Uint8Array, w: number, h: number, r: number): Uint8ClampedArray {
  const d = distanceFromSubject(subject, w, h);
  const a = new Uint8ClampedArray(w * h);
  for (let i = 0; i < a.length; i++) a[i] = Math.max(0, Math.min(1, r - d[i] + 0.5)) * 255;
  return a;
}

export function boundingBox(subject: Uint8Array, w: number, h: number) {
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (subject[y * w + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// ---------------- Browser-only canvas helpers ----------------

type Src = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function srcSize(src: Src) {
  return "naturalWidth" in src ? { w: src.naturalWidth, h: src.naturalHeight } : { w: src.width, h: src.height };
}

const SHADOW = { color: "rgba(28,26,58,0.28)", blur: 14, offsetY: 6 };

/** Rounded-square photo sticker (Keep Photo, or when the cut-out fails). */
export function roundedPhotoSticker(src: Src): HTMLCanvasElement {
  const S = DIECUT.size;
  const out = canvas(S, S);
  const ctx = out.getContext("2d")!;
  const border = 8;
  const radius = 48;
  const box = S - DIECUT.margin * 2;
  const x0 = DIECUT.margin;
  const y0 = DIECUT.margin - 4;

  ctx.save();
  ctx.shadowColor = SHADOW.color;
  ctx.shadowBlur = SHADOW.blur;
  ctx.shadowOffsetY = SHADOW.offsetY;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(x0, y0, box, box, radius);
  ctx.fill();
  ctx.restore();

  // Centre square crop of the photo.
  const { w, h } = srcSize(src);
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = Math.max(0, (h - side) / 2 - (h > w ? side * 0.08 : 0)); // portraits: bias up toward the face
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x0 + border, y0 + border, box - border * 2, box - border * 2, radius - border);
  ctx.clip();
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, sx, sy, side, side, x0 + border, y0 + border, box - border * 2, box - border * 2);
  ctx.restore();
  return out;
}

/** Full die-cut. Returns the sticker canvas and whether a real cut-out happened. */
export function dieCutSticker(src: Src): { canvas: HTMLCanvasElement; cut: boolean } {
  const { w: iw, h: ih } = srcSize(src);
  const scale = Math.min(1, 768 / Math.max(iw, ih));
  const w = Math.round(iw * scale);
  const h = Math.round(ih * scale);
  const work = canvas(w, h);
  const wctx = work.getContext("2d", { willReadFrequently: true })!;
  wctx.drawImage(src, 0, 0, w, h);
  const img = wctx.getImageData(0, 0, w, h);
  const { bg, removedRatio } = buildBackgroundMask(img.data, w, h);
  if (!cutLooksValid(removedRatio)) return { canvas: roundedPhotoSticker(src), cut: false };

  const subjectMask = new Uint8Array(w * h);
  for (let i = 0; i < bg.length; i++) subjectMask[i] = bg[i] ? 0 : 1;
  removeSpecks(subjectMask, w, h);
  const bb = boundingBox(subjectMask, w, h);
  if (!bb) return { canvas: roundedPhotoSticker(src), cut: false };

  // Punch out the background.
  for (let i = 0; i < subjectMask.length; i++) if (!subjectMask[i]) img.data[i * 4 + 3] = 0;
  wctx.putImageData(img, 0, 0);

  // Place the subject's bounding box centred in the output square.
  const S = DIECUT.size;
  const R = DIECUT.outline;
  const inner = S - 2 * (R + DIECUT.margin);
  const k = inner / Math.max(bb.w, bb.h);
  const dw = bb.w * k;
  const dh = bb.h * k;
  const dx = (S - dw) / 2;
  const dy = (S - dh) / 2 - 4;

  const subject = canvas(S, S);
  const sctx = subject.getContext("2d", { willReadFrequently: true })!;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(work, bb.x, bb.y, bb.w, bb.h, dx, dy, dw, dh);

  // Outline = subject silhouette dilated by R, filled white.
  const sdata = sctx.getImageData(0, 0, S, S).data;
  const sil = new Uint8Array(S * S);
  for (let i = 0; i < sil.length; i++) sil[i] = sdata[i * 4 + 3] > 96 ? 1 : 0;
  const alpha = dilateAlpha(sil, S, S, R);
  const outline = canvas(S, S);
  const octx = outline.getContext("2d")!;
  const odata = octx.createImageData(S, S);
  for (let i = 0; i < alpha.length; i++) {
    odata.data[i * 4] = 255;
    odata.data[i * 4 + 1] = 255;
    odata.data[i * 4 + 2] = 255;
    odata.data[i * 4 + 3] = alpha[i];
  }
  octx.putImageData(odata, 0, 0);

  const out = canvas(S, S);
  const ctx = out.getContext("2d")!;
  ctx.save();
  ctx.shadowColor = SHADOW.color;
  ctx.shadowBlur = SHADOW.blur;
  ctx.shadowOffsetY = SHADOW.offsetY;
  ctx.drawImage(outline, 0, 0);
  ctx.restore();
  ctx.drawImage(subject, 0, 0);
  return { canvas: out, cut: true };
}
