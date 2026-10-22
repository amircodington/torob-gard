import type { ReactNode } from "react";
import { SessionProvider, type Stage } from "../state/session";
import { TopBar } from "./TopBar";

// ponytail: each journey page wraps itself; state survives page changes through sessionStorage.
/** `stage` is the stage this page shows; the URL owns it. */
/** `productId` (radar) is the product in the URL; it wins over the stored one. */
export function JourneyShell({ stage, productId, children }: { stage: Stage; productId?: string; children: ReactNode }) {
  return (
    <SessionProvider stage={stage} productId={productId}>
      <TopBar />
      {/* opacity only: a transform here would trap the fixed compare tray and walk sheet (Review Focus 3) */}
      <div className="animate-page-in">{children}</div>
    </SessionProvider>
  );
}
