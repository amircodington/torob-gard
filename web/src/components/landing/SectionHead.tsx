import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Mascot, type MascotPose } from "../Mascot";

/** A band's header: icon chip + title (thin with one bold phrase) + one-line subtitle, and an optional mascot at the end. */
export function SectionHead({
  icon: Icon,
  title,
  sub,
  mascot,
  dark = false,
}: {
  icon: LucideIcon;
  title: ReactNode;
  sub: string;
  mascot?: MascotPose;
  dark?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 lg:gap-4">
      <span className={`grid size-11 shrink-0 place-items-center rounded-full lg:size-12 ${dark ? "bg-orange text-on-orange" : "bg-panel text-on-dark"}`}>
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-[22px] leading-8 font-light text-balance lg:text-[30px] lg:leading-10">{title}</h2>
        <p className={`text-[15px] leading-6 lg:text-[17px] lg:leading-7 ${dark ? "text-on-dark/75" : "text-ink-muted"}`}>{sub}</p>
      </div>
      {mascot && <Mascot pose={mascot} loading="lazy" className="-mb-6 -mt-2 ms-auto size-16 min-[360px]:size-20 lg:-mb-8 lg:-mt-6 lg:size-32" />}
    </div>
  );
}
