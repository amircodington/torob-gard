import type { CSSProperties } from "react";
import type { Chip } from "../../state/session";
import { chipIcon, isDirectional } from "../ui/chipIcon";

// No sliding pill here: a chat history is not a segmented control, so the picked chip simply keeps its orange.
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
      {chips.map((c, i) => {
        const selected = c.label === selectedLabel;
        const Icon = chipIcon(c.id);
        return (
          <button
            key={c.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onPick(c)}
            style={{ "--i": i } as CSSProperties}
            // fill-mode backwards: once in, the entrance lets go of opacity so the 50% siblings fade (180 ms)
            className={`stagger flex min-h-11 animate-rise items-center gap-2 rounded-pill px-4 py-1.5 text-start text-[15px] font-bold leading-5 shadow-card transition-[background-color,color,opacity,scale] duration-(--duration-fast) ease-out [animation-fill-mode:backwards] focus-visible:outline-2 focus-visible:outline-focus motion-safe:active:scale-[0.97] active:duration-(--duration-press) disabled:active:scale-100 ${
              selected ? "bg-orange text-on-orange" : "bg-surface text-ink enabled:hover:bg-orange-tint"
            } ${disabled && !selected ? "opacity-50" : ""}`}
          >
            {Icon && <Icon aria-hidden className={`size-4 ${isDirectional(Icon) ? "flip-rtl" : ""} ${selected ? "" : "text-ink-muted"}`} />}
            <span className="flex flex-col">
              <span>{c.label}</span>
              {c.hint && <span className={`text-[12px] font-normal ${selected ? "text-on-orange" : "text-ink-muted"}`}>{c.hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
