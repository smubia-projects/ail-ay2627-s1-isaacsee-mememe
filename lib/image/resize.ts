// Client-side: decode, resize to max 1024px on the long edge, re-encode to JPEG.
// Re-encoding through a canvas drops EXIF (incl. GPS) and keeps the upload well under Vercel's body limit.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_EDGE = 1024;

export class ImageReadError extends Error {}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Fallback: some browsers decode formats via <img> that createImageBitmap rejects.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export async function prepareUpload(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  const isHeic = /hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (!ACCEPTED_TYPES.includes(file.type) && !isHeic) {
    throw new ImageReadError("That file isn't a photo we can use. Try a JPG, PNG, WEBP or HEIC.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageReadError("That photo is over 10 MB. Try a smaller one.");
  }

  let src: ImageBitmap | HTMLImageElement;
  try {
    src = await decode(file);
  } catch {
    throw new ImageReadError(
      isHeic
        ? "This browser can't open HEIC photos. Try Safari, or export the photo as JPG first."
        : "We couldn't read that photo. Try a different one.",
    );
  }

  const w = "naturalWidth" in src ? src.naturalWidth : src.width;
  const h = "naturalHeight" in src ? src.naturalHeight : src.height;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // flatten any PNG transparency
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, width, height);
  if ("close" in src) src.close();

  return { dataUrl: canvas.toDataURL("image/jpeg", 0.86), width, height };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = src;
  });
}
