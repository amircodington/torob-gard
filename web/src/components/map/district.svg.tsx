import { project } from "../../lib/geo";

// ponytail: hand-placed sketch, not a map. Streets are approximate polylines in 0–100 space.
const STREETS: { name: string; d: string; label: [number, number] }[] = [
  { name: "جمهوری", d: "M2 68 Q30 64 55 66 T98 62", label: [18, 63] },
  { name: "لاله‌زار", d: "M52 4 Q54 40 50 98", label: [56, 22] },
  { name: "فردوسی", d: "M30 4 Q32 40 28 98", label: [34, 22] },
  { name: "سعدی", d: "M74 4 Q72 40 76 98", label: [78, 22] },
  { name: "منوچهری", d: "M2 22 Q40 18 98 24", label: [14, 18] },
  { name: "اکباتان", d: "M86 6 Q88 20 90 34", label: [93, 14] },
];

const METRO = [
  { name: "سعدی", ...project(35.6907, 51.413)! },
  { name: "ملت", ...project(35.6895, 51.4215)! },
  { name: "بهارستان", ...project(35.692, 51.431)! },
];

export function DistrictSvg() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <rect width="100" height="100" className="fill-blush-soft" />
      {STREETS.map((s) => (
        <g key={s.name}>
          <path d={s.d} fill="none" strokeLinecap="round" strokeWidth="2.4" className="stroke-ink-muted" opacity="0.22" />
          <text x={s.label[0]} y={s.label[1]} fontSize="2.8" textAnchor="middle" className="fill-ink-muted">
            {s.name}
          </text>
        </g>
      ))}
      {METRO.map((m) => (
        <g key={m.name}>
          <circle cx={m.x} cy={m.y} r="1.6" className="fill-panel" />
          <text x={m.x} y={m.y + 5} fontSize="2.8" fontWeight="700" textAnchor="middle" className="fill-ink">
            {m.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
