/** A pill; a button when it has onClick, orange when selected. */
export function Chip({ label, selected, onClick }: { label: string; selected?: boolean; onClick?: () => void }) {
  const cls = `inline-flex items-center rounded-pill px-3 text-[13px] font-bold leading-5 ${
    selected ? "bg-orange text-on-orange" : "bg-surface text-ink shadow-card"
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
