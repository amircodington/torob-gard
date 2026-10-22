import { ClipboardList, MapPinned, Package, RotateCcw, Sprout } from "lucide-react";
import { cn } from "../utils/cn";
import { resetStorage, useSession, type Stage } from "../state/session";
import { MASCOT_ASSETS } from "./Mascot";

const STEPS: { stage: Stage; label: string; Icon: typeof Package }[] = [
  { stage: "consult", label: "نیازها", Icon: Sprout },
  { stage: "products", label: "میز تصمیم", Icon: ClipboardList },
  { stage: "radar", label: "رادار فروشگاه", Icon: MapPinned },
  { stage: "summary", label: "آماده‌ی رفتن", Icon: Package },
];

const ORDER: Stage[] = ["consult", "products", "radar", "summary"];

export function TopBar() {
  const { state, dispatch } = useSession();
  const cur = ORDER.indexOf(state.stage);
  const max = ORDER.indexOf(state.maxStage);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/85 backdrop-blur supports-[backdrop-filter]:bg-cream/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:px-5">
        {/* identity */}
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-mascot ring-1 ring-line">
            <img src={MASCOT_ASSETS.icon} alt="ترب‌گرد" className="h-full w-full object-contain" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold">ترب‌گرد</span>
            <span className="hidden text-[10px] font-medium text-sub sm:block">از چی بخرم تا از کجا بخرم!</span>
          </span>
          <span className="rounded-full border border-dashed border-brand/40 bg-brand-tint px-2 py-0.5 text-[9px] font-bold text-brand-deep">
            نمونه‌ی هکاتون
          </span>
        </div>

        {/* steps */}
        <nav aria-label="مراحل خرید" className="mx-auto flex items-center">
          {STEPS.map((s, i) => {
            const reachable = i <= max;
            const active = i === cur;
            const done = i < cur;
            return (
              <div key={s.stage} className="flex items-center">
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => dispatch({ type: "GO", stage: s.stage })}
                  className={cn(
                    "focusable flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition sm:px-3",
                    active && "bg-ink text-white",
                    !active && reachable && "text-sub hover:bg-black/5 hover:text-ink",
                    !reachable && "cursor-not-allowed text-faint"
                  )}
                >
                  <s.Icon className={cn("h-3.5 w-3.5", done && "text-mint", active && "text-white")} />
                  <span className={cn(i > 0 && "hidden md:inline")}>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <span className="mx-0.5 h-px w-3 bg-line sm:w-5" />}
              </div>
            );
          })}
        </nav>

        {/* reset */}
        <button
          type="button"
          onClick={() => {
            resetStorage();
            dispatch({ type: "RESET" });
          }}
          className="focusable flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-sub transition hover:border-brand/50 hover:text-brand-deep"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">شروع دوباره</span>
        </button>
      </div>
    </header>
  );
}
