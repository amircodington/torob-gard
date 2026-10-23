import { Mascot } from "../Mascot";

/** The delay baked into --animate-loader-in (globals.css; Loader.test keeps them equal). */
export const LOADER_DELAY_MS = 150;

/** Three orange dots pulsing in turn (the agent's typing dots); static under reduced motion. */
export function Dots() {
  return (
    <span aria-hidden className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ animationDelay: `${i * 160}ms` }} className="size-1.5 animate-typing rounded-full bg-orange opacity-40" />
      ))}
    </span>
  );
}

/** Page loader: the radish hopping over its shadow, the dots and «یه لحظه…», centred. Pure CSS from the server paint;
 *  it appears only after LOADER_DELAY_MS, so a fast load shows nothing. Reduced motion: a still mascot and the text. */
export function Loader({ label = "یه لحظه…" }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-[60dvh] animate-loader-in place-content-center justify-items-center gap-4 py-12">
      <span className="grid justify-items-center">
        <Mascot pose="search" loading="eager" className="size-28 origin-bottom animate-loader-hop" />
        {/* radial gradient, not blur(): a soft edge with no filter cost */}
        <span aria-hidden className="-mt-1.5 h-3 w-20 animate-loader-shadow rounded-[50%] bg-[radial-gradient(closest-side,rgba(91,58,31,0.28),transparent)]" />
      </span>
      <span className="flex items-center gap-2.5 text-[15px] font-semibold text-ink-muted">
        <Dots />
        {label}
      </span>
    </div>
  );
}
