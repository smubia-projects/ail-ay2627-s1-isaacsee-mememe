"use client";

import { useMemo } from "react";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ActionBar({
  blob,
  onToast,
  onAnotherVibe,
  onNewPhoto,
}: {
  blob: Blob;
  onToast: (m: string) => void;
  onAnotherVibe: () => void;
  onNewPhoto: () => void;
}) {
  // Only rendered client-side after a sticker exists, so feature detection in render is safe.
  // Unsupported actions stay hidden.
  const canShare = useMemo(() => {
    const file = new File([blob], "mememe-sticker.png", { type: "image/png" });
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  }, [blob]);
  const canCopy = typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;

  const share = async () => {
    const file = new File([blob], "mememe-sticker.png", { type: "image/png" });
    try {
      await navigator.share({ files: [file], title: "My MemeMe sticker" });
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") onToast("Couldn't open sharing. Try Download PNG instead.");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      onToast("Copied");
    } catch {
      onToast("Couldn't copy. Try Download PNG instead.");
    }
  };

  const secondary = "rounded-full border-2 border-line bg-surface px-4 py-2.5 font-semibold hover:border-pop/60";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            downloadBlob(blob, `mememe-sticker-${Date.now()}.png`);
            onToast("Downloaded");
          }}
          className="rounded-full bg-pop px-5 py-2.5 font-semibold text-[#1C1A3A]"
        >
          Download PNG
        </button>
        {canShare && (
          <button type="button" onClick={share} className={secondary}>
            Share
          </button>
        )}
        {canCopy && (
          <button type="button" onClick={copy} className={secondary}>
            Copy image
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onAnotherVibe} className={secondary}>
          Try another vibe
        </button>
        <button type="button" onClick={onNewPhoto} className={secondary}>
          New photo
        </button>
      </div>
      <details className="rounded-[20px] bg-surface border border-line px-4 py-3 group">
        <summary className="cursor-pointer font-semibold">Add it to Telegram or WhatsApp</summary>
        <div className="mt-2 space-y-3 text-[15px] text-muted prose-width">
          <p>
            <strong className="text-ink">Telegram:</strong> open a chat with <code>@Stickers</code>, send <code>/newpack</code> (or <code>/addsticker</code>), then send the PNG as a <em>file</em> so it keeps its transparent background, and pick an emoji for it.
          </p>
          <p>
            <strong className="text-ink">WhatsApp:</strong> on iPhone, save the PNG, open it in Photos, then copy and paste it into a chat to send it as a sticker. On Android, use a sticker-maker app to import the PNG into a pack. On WhatsApp Web, use the sticker icon and choose Create.
          </p>
        </div>
      </details>
    </div>
  );
}
