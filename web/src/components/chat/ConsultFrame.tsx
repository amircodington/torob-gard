import type { ReactNode } from "react";

/** Consult layout: the phone is the chat column alone; lg adds a sticky summary rail beside it. */
export function ConsultFrame({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,640px)_320px] lg:justify-center lg:gap-8">
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <aside aria-label="نیاز تو تا اینجا" className="sticky top-20 mt-6 hidden self-start lg:block">
        {aside}
      </aside>
    </div>
  );
}
