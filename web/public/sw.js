// ترب‌گرد service worker: shell + fonts + mascot precached, the last 3 trips kept for offline use.
// Bump VERSION when this file or the precache list changes; activate deletes every other version.
const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const TRIPS = `trips-${VERSION}`;
const API = `api-${VERSION}`;
const PRECACHE = [
  "/offline",
  "/manifest.webmanifest",
  "/fonts/Vazirmatn[wght].woff2",
  "/icons/icon-192.png",
  ...["icon", "mascot-idle", "mascot-point", "mascot-stuck", "mascot-wave"].map((p) => `/mascot/torob-gard-${p}.webp`),
];
const KEEP_TRIPS = 3;
const KEEP_API = 30;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  const mine = [SHELL, TRIPS, API];
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !mine.includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Never touch: writes, other origins, the agent stream, reports, dev HMR.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/agent/") || url.pathname.startsWith("/api/reports") || url.pathname.startsWith("/_next/webpack-hmr")) return;

  if (req.mode === "navigate") return e.respondWith(page(req, url));
  if (url.pathname.startsWith("/api/")) return e.respondWith(networkFirst(req, API, KEEP_API));
  if (url.pathname.startsWith("/_next/static/") || PRECACHE.includes(decodeURI(url.pathname))) return e.respondWith(cacheFirst(req));
});

const tripId = (path) => path.match(/^\/trip\/([^/]+)/)?.[1];

async function page(req, url) {
  const id = tripId(url.pathname);
  try {
    const res = await fetch(req);
    if (id && res.ok) await keepTrip(req, res.clone(), id);
    return res;
  } catch {
    const hit = id && (await caches.open(TRIPS).then((c) => c.match(req, { ignoreSearch: true })));
    if (hit) return markOffline(hit);
    return (await caches.match("/offline")) ?? Response.error();
  }
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

// Honesty: a saved copy must say so. <html data-offline> shows the layout's offline note; price ages stay as rendered.
async function markOffline(res) {
  const html = (await res.text()).replace("<html", "<html data-offline");
  return new Response(html, { status: res.status, headers: res.headers });
}

async function networkFirst(req, name, keep) {
  const c = await caches.open(name);
  try {
    const res = await fetch(req);
    if (res.ok) {
      await c.put(req, res.clone());
      const keys = await c.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - keep)).map((k) => c.delete(k)));
    }
    return res;
  } catch {
    return (await c.match(req)) ?? Response.error();
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) await caches.open(SHELL).then((c) => c.put(req, res.clone()));
  return res;
}
