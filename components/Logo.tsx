/** Sticker-style wordmark: a die-cut "M" blob next to the name. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M32 3c14 0 28 8 28 27S48 61 31 61 4 50 4 32 18 3 32 3z" fill="#fff" />
      <path d="M32 9c11 0 22 6 22 21S45 55 31 55 10 46 10 32 21 9 32 9z" fill="#FF4F9A" />
      <path d="M19 41V23l7 9 6-9 6 9 7-9v18" fill="none" stroke="#1C1A3A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="48" cy="15" r="4" fill="#FFD23F" />
    </svg>
  );
}
