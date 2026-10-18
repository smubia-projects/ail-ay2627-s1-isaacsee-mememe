import Image from "next/image";

export type Example = {
  /** Real PNG made with the app, in /public/examples. Falls back to the emoji art if missing. */
  src?: string;
  emoji: string;
  top?: string;
  bottom?: string;
  font: "anton" | "baloo" | "bricolage";
  alt: string;
};

export const EXAMPLES: Example[] = [
  { emoji: "🐶", top: "Hooman,", bottom: "the bowl is only 80% full", font: "baloo", alt: "Dog sticker captioned: Hooman, the bowl is only 80% full" },
  { emoji: "🐱", top: "Monday mood:", bottom: "not today", font: "anton", alt: "Cat sticker captioned: Monday mood: not today" },
  { emoji: "🐹", top: "Exam season me:", bottom: "surviving on kopi", font: "bricolage", alt: "Hamster sticker captioned: Exam season me, surviving on kopi" },
  { emoji: "🐰", bottom: "Sending you a big hug", font: "baloo", alt: "Bunny sticker captioned: Sending you a big hug" },
  { emoji: "🦜", top: "Betrayal.", bottom: "You ate my last fishball.", font: "anton", alt: "Parrot sticker captioned: Betrayal. You ate my last fishball." },
  { emoji: "🐼", top: "Me during the 8am lecture", bottom: "No thoughts, head empty", font: "bricolage", alt: "Panda sticker captioned: Me during the 8am lecture. No thoughts, head empty" },
];

const FONT_VAR = { anton: "var(--font-anton)", baloo: "var(--font-baloo)", bricolage: "var(--font-bricolage)" };

function Caption({ text, font }: { text: string; font: Example["font"] }) {
  return (
    <span
      className="relative z-10 block text-center leading-[1.02] text-white px-[3cqw]"
      style={{
        fontFamily: FONT_VAR[font],
        fontWeight: font === "anton" ? 400 : 800,
        textTransform: font === "anton" ? "uppercase" : undefined,
        fontSize: font === "anton" ? "10.5cqw" : "9.5cqw",
        WebkitTextStroke: "1.6cqw #1C1A3A",
        paintOrder: "stroke fill",
      }}
    >
      {text}
    </span>
  );
}

/** A sticker with a die-cut white outline (stacked drop-shadows) and a caption, like the app's output. */
export function ExampleSticker({ ex, className = "", rotate = 0 }: { ex: Example; className?: string; rotate?: number }) {
  if (ex.src) {
    return <Image src={ex.src} alt={ex.alt} width={512} height={512} className={className} style={{ rotate: `${rotate}deg` }} />;
  }
  return (
    <figure role="img" aria-label={ex.alt} className={`aspect-square flex flex-col items-center justify-center ${className}`} style={{ rotate: `${rotate}deg`, containerType: "inline-size" }}>
      {ex.top && <Caption text={ex.top} font={ex.font} />}
      <span
        aria-hidden
        className="leading-none select-none my-[-0.04em]"
        style={{
          fontSize: "50cqw",
          filter:
            "drop-shadow(2.2cqw 0 0 #fff) drop-shadow(-2.2cqw 0 0 #fff) drop-shadow(0 2.2cqw 0 #fff) drop-shadow(0 -2.2cqw 0 #fff) drop-shadow(0 6px 0 rgba(28,26,58,.12)) drop-shadow(0 10px 14px rgba(28,26,58,.18))",
        }}
      >
        {ex.emoji}
      </span>
      {ex.bottom && <Caption text={ex.bottom} font={ex.font} />}
    </figure>
  );
}
