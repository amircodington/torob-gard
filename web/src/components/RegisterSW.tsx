"use client";

import { useEffect } from "react";

/** Registers /sw.js in production; in `next dev` only with NEXT_PUBLIC_SW=1 (a worker fights HMR). */
export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_SW !== "1") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
