import type { ReactNode } from "react";
import { Mascot, type MascotPose } from "../Mascot";

/** Pose by meaning (brand README): no results → search, broken → stuck, not started → phone. One motion each. */
export function EmptyState({ pose, title, body, actions }: { pose: MascotPose; title: string; body?: string; actions?: ReactNode }) {
  return (
    <section className="flex flex-col items-center px-2 py-8 text-center">
      <Mascot pose={pose} react={pose === "stuck" ? "shake" : "pop"} className="size-36" />
      <h2 className="mt-4 max-w-full text-[20px] font-extrabold leading-8 [overflow-wrap:anywhere]">{title}</h2>
      {body && <p className="mt-2 max-w-full text-[15px] leading-6 text-ink-muted [overflow-wrap:anywhere]">{body}</p>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </section>
  );
}
