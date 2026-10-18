import Link from "next/link";
import { LogoMark } from "./Logo";

export function SiteHeader({ cta = false }: { cta?: boolean }) {
  return (
    <header className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 rounded-full" aria-label="MemeMe home">
        <LogoMark />
        <span className="font-display text-xl font-extrabold tracking-[-0.02em]">MemeMe</span>
      </Link>
      {cta && (
        <Link href="/create" className="rounded-full border-2 border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-pop/60">
          Make a sticker
        </Link>
      )}
    </header>
  );
}
