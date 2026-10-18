"use client";

export function ConsentBox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-[20px] bg-surface border border-line p-4 cursor-pointer">
      <input
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--pop)]"
      />
      <span className="text-[15px] leading-snug">
        This is me, my pet, or someone who agreed to this. I won&apos;t use it to harass or impersonate anyone.
      </span>
    </label>
  );
}
