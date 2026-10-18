export function BlockedCard({ message, onChoose }: { message: string; onChoose: () => void }) {
  return (
    <div role="alert" className="max-w-sm mx-auto text-center rounded-[20px] bg-surface border border-line p-6">
      <span aria-hidden className="text-4xl">🛑</span>
      <h2 className="mt-2 text-2xl font-extrabold">Let&apos;s use a different photo</h2>
      <p className="mt-2 text-muted">{message}</p>
      <button type="button" onClick={onChoose} className="mt-4 rounded-full bg-pop px-5 py-2.5 font-semibold text-[#1C1A3A]">
        Choose another photo
      </button>
    </div>
  );
}
