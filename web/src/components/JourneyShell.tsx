import type { ReactNode } from "react";
import { SessionProvider } from "../state/session";
import { TopBar } from "./TopBar";

// ponytail: each journey page wraps itself; state survives page changes through sessionStorage.
export function JourneyShell({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TopBar />
      {children}
    </SessionProvider>
  );
}
