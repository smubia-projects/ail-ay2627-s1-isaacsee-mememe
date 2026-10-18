"use client";

import { useState } from "react";
import { ApiError, postJson } from "@/lib/api";
import { renderLines } from "@/lib/render";
import type { CaptionOption, SlotName, Slots } from "@/lib/schemas";

/** "Top line" / "Bottom line" for two-slot formats, else the pattern around the slot ("Me after …"). */
function slotLabel(o: CaptionOption, s: SlotName, count: number) {
  const where = s === "top" ? "Top line" : "Bottom line";
  if (count > 1) return where;
  const hint = o.template.pattern[s]?.replace(`{${s}}`, "…").trim();
  return hint && hint !== "…" ? hint : where;
}

const REJECT_MSG = "That caption could hurt someone, so we can't use it. Try a joke about the situation instead.";

export function CaptionOptions({
  options,
  selected,
  onSelect,
  onCommit,
}: {
  options: CaptionOption[];
  selected: number;
  onSelect: (i: number) => void;
  onCommit: (i: number, slots: Slots) => void;
}) {
  const current = options[selected];

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Caption options" className="grid gap-2">
        {options.map((o, i) => {
          const lines = renderLines(o.template, o.slots);
          const isSel = i === selected;
          return (
            <button
              key={o.template.id + i}
              type="button"
              role="radio"
              aria-checked={isSel}
              tabIndex={isSel ? 0 : -1}
              onClick={() => onSelect(i)}
              onKeyDown={(e) => {
                const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
                if (!d) return;
                e.preventDefault();
                const n = (i + d + options.length) % options.length;
                onSelect(n);
                (e.currentTarget.parentElement?.children[n] as HTMLElement | undefined)?.focus();
              }}
              className={`text-left rounded-[20px] border-2 p-3.5 transition-colors ${isSel ? "border-pop bg-pop/10" : "border-line bg-surface hover:border-pop/50"}`}
            >
              <span className="block text-[13px] text-muted font-medium">{o.template.name}</span>
              <span className="block font-semibold leading-snug whitespace-pre-line">{[lines.top, lines.bottom].filter(Boolean).join("\n")}</span>
            </button>
          );
        })}
      </div>

      {/* Keyed so the draft resets whenever the option or its committed text changes. */}
      <CaptionEditor key={`${selected}:${JSON.stringify(current.slots)}`} option={current} onCommit={(slots) => onCommit(selected, slots)} />
    </div>
  );
}

function CaptionEditor({ option: current, onCommit }: { option: CaptionOption; onCommit: (slots: Slots) => void }) {
  const slotNames = (["top", "bottom"] as const).filter((s) => current.template.pattern[s]?.includes(`{${s}}`));
  const [draft, setDraft] = useState<Slots>(current.slots);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commit(slot: SlotName) {
    const value = (draft[slot] ?? "").trim();
    if (value === (current.slots[slot] ?? "")) return;
    if (!value) {
      setError("A caption needs at least a few words.");
      setDraft(current.slots);
      return;
    }
    if (value.length > 60) {
      setError("Keep each line under 60 characters so it fits on the sticker.");
      return;
    }
    const next = { ...current.slots, [slot]: value };
    const text = Object.values(renderLines(current.template, next)).join(" / ");
    setChecking(true);
    setError(null);
    try {
      const v = await postJson<{ safe: boolean }>("/api/moderate", { text }, 20_000);
      if (v.safe) onCommit(next);
      else {
        setError(REJECT_MSG);
        setDraft(current.slots);
      }
    } catch (e) {
      setError(e instanceof ApiError ? `${e.message} Your edit wasn't saved.` : "We couldn't check that caption. Try again.");
      setDraft(current.slots);
    } finally {
      setChecking(false);
    }
  }

  return (
      <div className="rounded-[20px] bg-surface border border-line p-4">
        <p className="font-semibold">Edit caption</p>
        <div className="mt-2 space-y-2">
          {slotNames.map((s) => (
            <label key={s} className="block">
              <span className="text-[13px] text-muted">{slotLabel(current, s, slotNames.length)}</span>
              <input
                value={draft[s] ?? ""}
                maxLength={60}
                onChange={(e) => setDraft({ ...draft, [s]: e.target.value })}
                onBlur={() => commit(s)}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                aria-invalid={!!error}
                aria-describedby="caption-edit-msg"
                className="mt-1 w-full rounded-[14px] border-2 border-line bg-paper px-3 py-2 outline-none focus:border-pop"
              />
            </label>
          ))}
        </div>
        <p id="caption-edit-msg" className={`mt-2 text-sm min-h-5 ${error ? "text-danger font-medium" : "text-muted"}`} role={error ? "alert" : undefined}>
          {checking ? "Checking caption…" : error ?? "Edits are safety-checked when you leave the field."}
        </p>
      </div>
  );
}
