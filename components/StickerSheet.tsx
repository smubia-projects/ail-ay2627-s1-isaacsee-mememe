"use client";

import { useState } from "react";
import { downloadBlob } from "./ActionBar";

export type SheetItem = { id: string; url: string; blob: Blob; label: string };

/** Stickers made this session. In-memory only: refresh clears it, matching the no-storage promise. */
export function StickerSheet({ items, onToast }: { items: SheetItem[]; onToast: (m: string) => void }) {
  const [zipping, setZipping] = useState(false);
  if (items.length === 0) return null;

  const downloadAll = async () => {
    setZipping(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      items.forEach((it, i) => zip.file(`mememe-${String(i + 1).padStart(2, "0")}.png`, it.blob));
      downloadBlob(await zip.generateAsync({ type: "blob" }), "mememe-stickers.zip");
      onToast("Downloaded");
    } catch {
      onToast("Couldn't build the zip. Download stickers one by one instead.");
    } finally {
      setZipping(false);
    }
  };

  return (
    <section aria-labelledby="sheet-title" className="rounded-[28px] bg-surface/70 border border-line p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 id="sheet-title" className="text-2xl font-extrabold">
            Your sticker sheet
          </h2>
          <p className="text-sm text-muted">Only kept in this tab. Refreshing clears it.</p>
        </div>
        {items.length > 1 && (
          <button type="button" onClick={downloadAll} disabled={zipping} className="rounded-full border-2 border-line bg-surface px-4 py-2 font-semibold hover:border-pop/60">
            {zipping ? "Zipping…" : `Download all (${items.length})`}
          </button>
        )}
      </div>
      <ul className="mt-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((it, i) => (
          <li key={it.id} style={{ rotate: `${[-4, 3, -2, 5, -5, 2][i % 6]}deg` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.url} alt={`Sticker ${i + 1}: ${it.label}`} className="w-full aspect-square" />
          </li>
        ))}
      </ul>
    </section>
  );
}
