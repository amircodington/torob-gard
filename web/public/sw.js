// ترب‌گرد service worker: shell + fonts + mascot precached per build, the last 3 trips kept for offline use.
// VERSION is the build id from the registration URL (/sw.js?v=…, see lib/sw.ts): a new build installs a new
// worker, re-precaches the shell, and activate drops the old shell.
// API responses are never cached: trip pages are SSR, so their data lives in the saved HTML.
const VERSION = new URL(self.location).searchParams.get("v") || "dev";
const SHELL = `shell-${VERSION}`;
const TRIPS = "trips-v1"; // survives builds; the chunks its pages need are kept in STATIC by gcStatic()
const STATIC = "static";
const PRECACHE = [
  "/offline",
  "/manifest.webmanifest",
  "/fonts/Vazirmatn[wght].woff2",
  "/icons/icon-192.png",
  ...["icon", "mascot-idle", "mascot-point", "mascot-stuck", "mascot-wave"].map((p) => `/mascot/torob-gard-${p}.webp`),
];
const KEEP_TRIPS = 3;
const SLOW_MS = 4000; // a trip page slower than this falls back to its saved copy

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  const mine = [SHELL, TRIPS, STATIC];
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !mine.includes(k)).map((k) => caches.delete(k))))
      .then(gcStatic)
      .then(() => self.clients.claim()),
  );
});

// Logout / «حذف داده‌هام» (Task 4): the page posts { type: "clear-trips" } via clearSavedTrips() in lib/sw.ts.
self.addEventListener("message", (e) => {
  if (e.data?.type === "clear-trips") e.waitUntil(caches.delete(TRIPS));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Only same-origin GETs; everything else (writes, /api, /agent SSE, HMR) goes straight to the network.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") return e.respondWith(page(e, req, url));
  if (url.pathname.startsWith("/_next/static/")) return e.respondWith(cacheFirst(req, STATIC));
  if (PRECACHE.includes(decodeURI(url.pathname))) return e.respondWith(cacheFirst(req, SHELL));
});

const tripId = (path) => path.match(/^\/trip\/([^/]+)/)?.[1];
const offlinePage = async () => (await caches.match("/offline", { cacheName: SHELL })) ?? Response.error();

async function page(e, req, url) {
  const id = tripId(url.pathname);
  if (!id) return fetch(req).catch(offlinePage);

  const saved = await caches.open(TRIPS).then((c) => c.match(req, { ignoreSearch: true }));
  const net = fetch(req).then(async (res) => {
    if (res.ok) await keepTrip(req, res.clone(), id);
    if (res.status >= 500 && saved) throw new Error(`upstream ${res.status}`); // a down API counts as offline here
    return res;
  });
  e.waitUntil(net.catch(() => {})); // a slow response still refreshes the saved copy
  const fallback = () => (saved ? markOffline(saved.clone()) : offlinePage());
  if (!saved) return net.catch(fallback);
  const slow = new Promise((r) => setTimeout(r, SLOW_MS)).then(fallback);
  return Promise.race([net.catch(fallback), slow]);
}

// Keep pages of the KEEP_TRIPS most recently visited trips (checklist and walk count as one trip).
async function keepTrip(req, res, id) {
  const c = await caches.open(TRIPS);
  const keys = await c.keys();
  await c.delete(req, { ignoreSearch: true });
  await c.put(new Request(req.url.split("?")[0]), res);
  // Cache keys are in insertion order; newest first, deduped (a trip has two pages).
  const newest = [...new Set([id, ...keys.map((k) => tripId(new URL(k.url).pathname)).reverse()])];
  const keep = new Set(newest.slice(0, KEEP_TRIPS));
  await Promise.all(keys.filter((k) => !keep.has(tripId(new URL(k.url).pathname))).map((k) => c.delete(k)));
}

// Drop /_next/static entries no saved page (trips + /offline) references: old builds' chunks go, saved trips still render.
async function gcStatic() {
  const pages = [...(await (await caches.open(TRIPS)).matchAll()), ...(await (await caches.open(SHELL)).matchAll("/offline"))];
  const used = new Set();
  for (const p of pages) for (const m of (await p.text()).matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) used.add(m[0]);
  const c = await caches.open(STATIC);
  await Promise.all((await c.keys()).filter((k) => !used.has(new URL(k.url).pathname)).map((k) => c.delete(k)));
}

// Honesty: a saved copy must say so. <html data-offline> shows the layout's offline note; price ages stay as rendered.
async function markOffline(res) {
  const html = (await res.text()).replace("<html", "<html data-offline");
  const headers = new Headers(res.headers);
  for (const h of ["content-length", "content-encoding"]) headers.delete(h); // the body was rewritten
  return new Response(html, { status: res.status, headers });
}

async function cacheFirst(req, name) {
  const hit = await caches.match(req, { cacheName: name });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) await caches.open(name).then((c) => c.put(req, res.clone()));
  return res;
}
