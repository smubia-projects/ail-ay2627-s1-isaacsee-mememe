import type { Slots, SlotName } from "./schemas";

/** Fill a template's pattern with slot values → final text per position. Client-safe. */
export function renderLines(
  t: { pattern: Partial<Record<SlotName, string>> },
  slots: Slots,
): Partial<Record<SlotName, string>> {
  const out: Partial<Record<SlotName, string>> = {};
  for (const pos of ["top", "bottom"] as const) {
    const p = t.pattern[pos];
    if (p === undefined) continue;
    out[pos] = p.replace(`{${pos}}`, slots[pos] ?? "").trim();
  }
  return out;
}
