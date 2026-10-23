/** Build id baked in at build time (next.config env); a new build registers /sw.js?v=<new>, which installs a new worker. */
export const SW_URL = `/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"}`;

/** Logout / «حذف داده‌هام»: drop the saved trips from the service worker's cache. */
export async function clearSavedTrips(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  (await navigator.serviceWorker.getRegistration())?.active?.postMessage({ type: "clear-trips" });
}
