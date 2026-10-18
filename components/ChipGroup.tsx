"use client";

import { motion } from "framer-motion";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

type Option<T extends string> = { value: T; label: string; description?: string; leading?: ReactNode };

/** A radio group drawn as chips. Arrow keys move + select, like native radios. */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  layout = "wrap",
}: {
  label: string;
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  layout?: "wrap" | "grid";
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const onKey = (e: KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={layout === "grid" ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <motion.button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === activeIndex ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.1 }}
            className={[
              "text-left border-2 transition-colors",
              layout === "grid" ? "rounded-[20px] p-2.5 flex items-center gap-3" : "rounded-full px-4 py-2 inline-flex items-center gap-2",
              selected
                ? "border-pop bg-pop/12 text-ink"
                : "border-line bg-surface text-ink hover:border-pop/50",
            ].join(" ")}
          >
            {o.leading}
            <span className="flex flex-col">
              <span className="font-semibold leading-tight">{o.label}</span>
              {o.description && <span className="text-[13px] leading-snug text-muted">{o.description}</span>}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
