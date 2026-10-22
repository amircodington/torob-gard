/** A pill; a button when it has onClick, orange when selected. */
export function Chip({ label, selected, onClick }: { label: string; selected?: boolean; onClick?: () => void }) {
  // Text on orange is 15px bold or larger (brand contrast rule); the resting pill stays 13px.
  const cls = `inline-flex items-center rounded-pill px-3 font-bold leading-5 ${
    selected ? "bg-orange text-[15px] text-on-orange" : "bg-surface text-[13px] text-ink shadow-card"
  }`;
  if (!onClick) return <span className={`${cls} py-1.5`}>{label}</span>;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`${cls} min-h-11 focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97]`}
    >
      {label}
    </button>
  );
}
