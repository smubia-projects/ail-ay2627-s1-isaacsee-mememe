"use client";

import { STYLES, STYLE_INFO, THEMES, THEME_INFO, type Style, type Theme } from "@/lib/options";
import { ChipGroup } from "./ChipGroup";

export function VibePicker({ value, onChange }: { value: Theme | null; onChange: (t: Theme) => void }) {
  return (
    <ChipGroup
      label="Vibe"
      layout="grid"
      value={value}
      onChange={onChange}
      options={THEMES.map((t) => ({
        value: t,
        label: THEME_INFO[t].label,
        description: `“${THEME_INFO[t].example}”`,
        leading: (
          <span aria-hidden className="text-2xl leading-none shrink-0">
            {THEME_INFO[t].emoji}
          </span>
        ),
      }))}
    />
  );
}

export function StylePicker({ value, onChange }: { value: Style | null; onChange: (s: Style) => void }) {
  return (
    <ChipGroup
      label="Sticker style"
      layout="grid"
      value={value}
      onChange={onChange}
      options={STYLES.map((s) => ({
        value: s,
        label: STYLE_INFO[s].label,
        description: STYLE_INFO[s].hint,
        leading: <StyleThumb style={s} />,
      }))}
    />
  );
}

/** Tiny hand-drawn previews of each style, so the choice is visual. */
function StyleThumb({ style }: { style: Style }) {
  const common = "w-11 h-11 shrink-0 rounded-[12px] bg-paper";
  if (style === "pixel") {
    // 8×8 pixel cat face
    const px = [
      "1......1",
      "11....11",
      "11111111",
      "12111121",
      "11111111",
      "11133111",
      ".111111.",
      "..1111..",
    ];
    return (
      <svg viewBox="0 0 8 8" className={common} aria-hidden shapeRendering="crispEdges">
        {px.flatMap((row, y) =>
          [...row].map((c, x) =>
            c === "." ? null : (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={c === "1" ? "#FFB347" : c === "2" ? "#1C1A3A" : "#FF4F9A"} />
            ),
          ),
        )}
      </svg>
    );
  }
  if (style === "photo") {
    return (
      <svg viewBox="0 0 44 44" className={common} aria-hidden>
        <rect x="6" y="6" width="32" height="32" rx="9" fill="#fff" />
        <rect x="9" y="9" width="26" height="26" rx="6" fill="#9AD7FF" />
        <path d="M9 30l8-9 6 6 4-4 8 8v2a6 6 0 0 1-6 6H15a6 6 0 0 1-6-6z" fill="#2ED3A1" />
        <circle cx="28" cy="16" r="3" fill="#FFD23F" />
      </svg>
    );
  }
  const chibi = style === "chibi";
  return (
    <svg viewBox="0 0 44 44" className={common} aria-hidden>
      <path d="M11 14l4-8 5 6M33 14l-4-8-5 6" fill="#FFB347" stroke="#1C1A3A" strokeWidth={chibi ? 1.5 : 2.5} strokeLinejoin="round" />
      <ellipse cx="22" cy={chibi ? 21 : 23} rx={chibi ? 15 : 13} ry={chibi ? 13 : 12} fill="#FFB347" stroke="#1C1A3A" strokeWidth={chibi ? 1.5 : 2.5} />
      {chibi ? (
        <>
          <circle cx="16" cy="21" r="4" fill="#1C1A3A" />
          <circle cx="28" cy="21" r="4" fill="#1C1A3A" />
          <circle cx="17.3" cy="19.5" r="1.4" fill="#fff" />
          <circle cx="29.3" cy="19.5" r="1.4" fill="#fff" />
          <ellipse cx="12" cy="26" rx="2.5" ry="1.5" fill="#FF4F9A" opacity=".6" />
          <ellipse cx="32" cy="26" rx="2.5" ry="1.5" fill="#FF4F9A" opacity=".6" />
        </>
      ) : (
        <>
          <circle cx="17" cy="22" r="2.2" fill="#1C1A3A" />
          <circle cx="27" cy="22" r="2.2" fill="#1C1A3A" />
          <path d="M18 28q4 3 8 0" stroke="#1C1A3A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {chibi && <path d="M19 27q3 2 6 0" stroke="#1C1A3A" strokeWidth="1.5" fill="none" strokeLinecap="round" />}
    </svg>
  );
}
