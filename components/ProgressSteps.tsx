"use client";

import { motion, useReducedMotion } from "framer-motion";

export const STAGES = [
  { id: "check", label: "Checking photo" },
  { id: "vibe", label: "Reading the vibe" },
  { id: "match", label: "Picking a meme" },
  { id: "draw", label: "Drawing sticker" },
  { id: "caption", label: "Writing caption" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];
export type StageState = Record<StageId, "pending" | "done">;

export const freshStages = (): StageState => ({ check: "pending", vibe: "pending", match: "pending", draw: "pending", caption: "pending" });

/** Each row ticks when its real API call resolves. No timers. */
export function ProgressSteps({ stages }: { stages: StageState }) {
  const reduce = useReducedMotion();
  return (
    <ol className="space-y-2.5" aria-live="polite">
      {STAGES.map((s) => {
        const done = stages[s.id] === "done";
        return (
          <li key={s.id} className="flex items-center gap-3">
            <span className="relative grid place-items-center h-6 w-6">
              <span className={`absolute inset-0 rounded-full border-2 ${done ? "border-transparent" : "border-line"}`} />
              {done && (
                <motion.span
                  initial={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
                  animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="absolute inset-0 rounded-full bg-mint grid place-items-center text-[13px] font-bold text-[#0d3b2e]"
                >
                  ✓
                </motion.span>
              )}
            </span>
            <span className={done ? "font-semibold" : "text-muted"}>
              {s.label}
              <span className="sr-only">{done ? ": done" : ": in progress"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
