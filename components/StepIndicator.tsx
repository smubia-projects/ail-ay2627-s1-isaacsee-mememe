const STEPS = ["Photo", "Vibe", "Make it"];

/** Numbered because this really is a sequence. `done` = how many steps are complete. */
export function StepIndicator({ done }: { done: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((s, i) => {
        const state = i < done ? "done" : i === done ? "current" : "todo";
        return (
          <li key={s} className="flex items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
            <span
              className={[
                "grid place-items-center h-7 w-7 rounded-full text-sm font-bold",
                state === "done" ? "bg-mint text-[#0d3b2e]" : state === "current" ? "bg-ink text-paper" : "bg-surface text-muted border border-line",
              ].join(" ")}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span className={`text-sm font-semibold ${state === "todo" ? "text-muted" : ""}`}>{s}</span>
            {i < STEPS.length - 1 && <span aria-hidden className="w-6 h-px bg-line mx-1" />}
          </li>
        );
      })}
    </ol>
  );
}
