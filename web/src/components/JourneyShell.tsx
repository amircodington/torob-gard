import type { ReactNode } from "react";
import { SessionProvider, type Stage } from "../state/session";
import { TopBar } from "./TopBar";

// ponytail: each journey page wraps itself; state survives page changes through sessionStorage.
/** `stage` is the stage this page shows; the URL owns it. */
export function JourneyShell({ stage, children }: { stage: Stage; children: ReactNode }) {
  return (
    <SessionProvider stage={stage}>
      <TopBar />
      {children}
    </SessionProvider>
  );
}
