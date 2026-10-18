import Link from "next/link";
import { EXAMPLES, ExampleSticker } from "@/components/ExampleSticker";
import { SiteHeader } from "@/components/SiteHeader";

const HOW = [
  { title: "Upload a photo", body: "You, a friend who said yes, or your pet. We resize it on your device and strip location data." },
  { title: "Pick a vibe and style", body: "Funny, Cute, Classic Meme, Wholesome or Dramatic. Cartoon, Chibi, Pixel Art or keep the photo." },
  { title: "Get your sticker", body: "AI matches a meme format, writes three captions and cuts out a 512×512 transparent PNG." },
];

const HERO = [
  { ex: EXAMPLES[0], cls: "left-[0%] top-[3%] w-[48%]", rot: -6 },
  { ex: EXAMPLES[1], cls: "right-[0%] top-[0%] w-[47%]", rot: 7 },
  { ex: EXAMPLES[2], cls: "left-[5%] bottom-[0%] w-[46%]", rot: 4 },
  { ex: EXAMPLES[3], cls: "right-[1%] bottom-[1%] w-[47%]", rot: -4 },
];

export default function Home() {
  return (
    <>
      <SiteHeader cta />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-16 lg:pt-14 grid lg:grid-cols-[1fr_1.05fr] gap-10 items-center">
          <div>
            <h1 className="text-[44px] sm:text-6xl lg:text-7xl font-extrabold">Turn your pet into a sticker.</h1>
            <p className="mt-5 text-lg text-muted prose-width">
              Upload a photo, pick a vibe, and MemeMe draws a die-cut meme sticker with a caption that actually fits. Ready for Telegram or WhatsApp in about 20 seconds.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/create" className="rounded-full bg-pop px-7 py-3.5 text-lg font-bold text-[#1C1A3A] shadow-[0_6px_0_rgba(28,26,58,.18)] hover:translate-y-[1px] transition-transform">
                Make a sticker
              </Link>
              <span className="text-sm text-muted">Free · no sign-up · nothing stored</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[520px] aspect-[1/1.08] text-[15px] sm:text-[19px]">
            {HERO.map(({ ex, cls, rot }) => (
              <ExampleSticker key={ex.alt} ex={ex} rotate={rot} className={`absolute ${cls}`} />
            ))}
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how" className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <h2 id="how" className="text-4xl sm:text-5xl font-extrabold">
            How it works
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {HOW.map((s, i) => (
              <li key={s.title} className="rounded-[20px] bg-surface border border-line p-6">
                <span className="grid place-items-center h-10 w-10 rounded-full bg-sun font-display text-xl font-extrabold text-[#1C1A3A]">{i + 1}</span>
                <h3 className="mt-4 text-2xl font-extrabold">{s.title}</h3>
                <p className="mt-2 text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Example strip */}
        <section aria-labelledby="examples" className="py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="examples" className="text-4xl sm:text-5xl font-extrabold">
              Made with MemeMe
            </h2>
            <p className="mt-2 text-muted">Five vibes, four styles, about 25 meme formats.</p>
          </div>
          <ul className="mx-auto max-w-6xl px-4 sm:px-6 mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 text-[13px] sm:text-[15px]">
            {EXAMPLES.map((ex, i) => (
              <li key={ex.alt}>
                <ExampleSticker ex={ex} rotate={[-4, 3, -2, 5, -5, 2][i]} />
              </li>
            ))}
          </ul>
        </section>

        {/* Safety */}
        <section aria-labelledby="safety" className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="rounded-[28px] bg-surface border border-line p-6 sm:p-10 grid md:grid-cols-[auto_1fr] gap-6 items-start">
            <span aria-hidden className="text-5xl">🛡️</span>
            <div>
              <h2 id="safety" className="text-3xl sm:text-4xl font-extrabold">
                Made to be kind
              </h2>
              <p className="mt-3 text-lg prose-width">No photos are stored. Kids and celebrities are blocked.</p>
              <ul className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-muted prose-width">
                <li>Captions joke about the moment, never someone&apos;s looks or identity.</li>
                <li>Every caption, including your edits, passes two safety checks.</li>
                <li>Text hidden in a photo is ignored, not obeyed.</li>
                <li>Every sticker carries a small “AI-generated” label.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 text-sm text-muted flex flex-wrap gap-x-6 gap-y-2 justify-between">
        <span>MemeMe · built for the SMU BIA AI Lodge Hackathon 2026</span>
        <span>Photos are processed in memory and never saved.</span>
      </footer>
    </>
  );
}
