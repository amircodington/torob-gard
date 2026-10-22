import type { ReactNode } from "react";
import { Mascot, type MascotPose } from "../Mascot";

export function EmptyState({ pose, title, body, actions }: { pose: MascotPose; title: string; body?: string; actions?: ReactNode }) {
  return (
    <section className="flex flex-col items-center px-2 py-8 text-center">
      <Mascot pose={pose} className="h-36 w-36 rounded-full object-cover object-top" />
      <h2 className="mt-4 text-[20px] font-extrabold leading-8">{title}</h2>
      {body && <p className="mt-2 text-[15px] leading-6 text-ink-muted">{body}</p>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </section>
  );
}
