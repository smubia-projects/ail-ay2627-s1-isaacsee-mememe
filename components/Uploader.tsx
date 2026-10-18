"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImageReadError, prepareUpload } from "@/lib/image/resize";

export type Photo = { dataUrl: string; width: number; height: number; id: number };

export function Uploader({ photo, onPhoto }: { photo: Photo | null; onPhoto: (p: Photo | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const p = await prepareUpload(file);
      onPhoto({ ...p, id: Date.now() });
    } catch (e) {
      setError(e instanceof ImageReadError ? e.message : "We couldn't read that photo. Try a different one.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handle(e.dataTransfer.files?.[0]);
  };

  const inputs = (
    <>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" className="sr-only" tabIndex={-1} onChange={(e) => handle(e.target.files?.[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="sr-only" tabIndex={-1} onChange={(e) => handle(e.target.files?.[0])} />
    </>
  );

  if (photo) {
    return (
      <div className="flex items-center gap-4 rounded-[20px] bg-surface border border-line p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.dataUrl} alt="Your uploaded photo" className="w-16 h-16 rounded-[14px] object-cover" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Photo ready</p>
          <p className="text-sm text-muted">Resized and stripped of location data.</p>
        </div>
        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full border-2 border-line px-4 py-2 text-sm font-semibold hover:border-pop/60">
          Change photo
        </button>
        {inputs}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-label="Upload a photo. Drag and drop, or press to choose a file."
        aria-describedby="upload-hint"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={busy}
        className={[
          "w-full rounded-[20px] border-[3px] border-dashed px-5 py-8 flex flex-col items-center gap-2 text-center transition-colors",
          dragging ? "border-pop bg-pop/10" : "border-line bg-surface hover:border-pop/50",
        ].join(" ")}
      >
        <span aria-hidden className="text-4xl">📸</span>
        <span className="font-display text-xl font-extrabold">{busy ? "Reading photo…" : "Drop a photo or choose one"}</span>
        <span id="upload-hint" className="text-sm text-muted">
          JPG, PNG, WEBP or HEIC, up to 10 MB. You, a friend who said yes, or your pet.
        </span>
      </button>
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="mt-2 w-full rounded-full border-2 border-line bg-surface px-4 py-2.5 text-sm font-semibold sm:hidden"
      >
        Take a photo
      </button>
      {inputs}
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
