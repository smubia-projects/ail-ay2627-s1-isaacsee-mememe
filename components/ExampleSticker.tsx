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

// Made with the app itself from stock pet photos (credits in README → External Tools & Datasets).
export const EXAMPLES: Example[] = [
  { src: "/examples/corgi.png", emoji: "🐶", font: "bricolage", alt: "Cartoon corgi standing on its back legs, captioned: Nobody: Me: waiting for the lift like this" },
  { src: "/examples/cat.png", emoji: "🐱", font: "anton", alt: "Chibi orange tabby cat, captioned: *gasp* the wifi just dropped for three seconds??" },
  { src: "/examples/golden.png", emoji: "🐶", font: "baloo", alt: "Cartoon golden retriever looking up, captioned: Sending you a warm sunshine hug" },
  { src: "/examples/pug.png", emoji: "🐶", font: "anton", alt: "Cartoon pug, captioned: When the prof says attendance is optional and you instantly regret trusting them" },
  { src: "/examples/hamster.png", emoji: "🐹", font: "baloo", alt: "Pixel-art hamster, captioned: That tiny nose living rent free in my head" },
  { src: "/examples/rabbit.png", emoji: "🐰", font: "baloo", alt: "Chibi spotted rabbit, captioned: This sweet little nose living rent free in my head" },
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
    return <Image src={ex.src} alt={ex.alt} width={512} height={512} sizes="(max-width: 640px) 50vw, 280px" className={`h-auto ${className}`} style={{ rotate: `${rotate}deg` }} />;
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
