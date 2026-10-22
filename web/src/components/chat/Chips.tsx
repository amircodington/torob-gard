import type { Chip } from "../../state/session";

export function Chips({
  chips,
  selectedLabel,
  disabled,
  onPick,
}: {
  chips: Chip[];
  selectedLabel?: string;
  disabled: boolean;
  onPick: (chip: Chip) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 pe-11">
      {chips.map((c) => {
        const selected = c.label === selectedLabel;
        return (
          <button
            key={c.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onPick(c)}
            className={`flex min-h-11 flex-col justify-center rounded-pill px-4 py-1.5 text-start text-[15px] font-bold leading-5 shadow-card transition-transform focus-visible:outline-2 focus-visible:outline-focus active:scale-[0.97] disabled:active:scale-100 ${
              selected ? "bg-orange text-on-orange" : "bg-surface text-ink"
            } ${disabled && !selected ? "opacity-50" : ""}`}
          >
            <span>{c.label}</span>
            {c.hint && <span className={`text-[12px] font-normal ${selected ? "text-on-orange" : "text-ink-muted"}`}>{c.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
