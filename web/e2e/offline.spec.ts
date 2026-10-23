import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// The service worker registers only in production builds (or NEXT_PUBLIC_SW=1), so this spec runs only with E2E_SW=1:
//   pnpm -C web build && PORT=3300 pnpm -C web start &
//   E2E_SW=1 E2E_PORT=3300 pnpm -C web exec playwright test e2e/offline.spec.ts --project=phone
test.skip(!process.env.E2E_SW, "needs a production server (E2E_SW=1)");
const PRODUCT = "product_a112c972266b57d0f7eddeab";

test.use({ permissions: [] });

test("pwa: manifest is installable and the service worker takes control", async ({ page, request }) => {
  const m = await (await request.get("/manifest.webmanifest")).json();
  expect(m).toMatchObject({ name: "ترب‌گرد", short_name: "ترب‌گرد", theme_color: "#fbf7f3", dir: "rtl", lang: "fa", display: "standalone", start_url: "/" });
  for (const size of ["192x192", "512x512"]) expect(m.icons.some((i: { sizes: string }) => i.sizes === size)).toBe(true);
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  for (const i of m.icons) expect((await request.get(i.src)).ok()).toBe(true);

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  expect(await page.evaluate(() => navigator.serviceWorker.ready.then((r) => r.active?.scriptURL))).toMatch(/\/sw\.js$/);
  // Chrome's own installability check (what Lighthouse's PWA audit used).
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  expect(installabilityErrors).toEqual([]);
});

async function makeTrip(request: APIRequestContext): Promise<string> {
  const offers: { shop: { id: string; unit: string | null } }[] = await (await request.get(`/api/products/${PRODUCT}/offers`)).json();
  const shop = offers.find((o) => o.shop.unit != null)!.shop;
  const res = await request.post("/api/trips", {
    data: { product_id: PRODUCT, chosen_shop_id: shop.id, req: { category: "mobile" }, failures: [], anchor: { lat: 35.6907, lng: 51.413 } },
  });
  expect(res.ok()).toBe(true);
  return (await res.json()).id;
}

async function controlled(page: Page) {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller != null);
}

test("offline: a visited trip and its walk mode open from the cache, an unvisited page shows /offline", async ({ browser, request }) => {
  const id = await makeTrip(request);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await controlled(page);
  // Visit both pages online: the worker keeps them.
  await page.goto(`/trip/${id}`);
  await expect(page.getByRole("heading", { name: "چک‌لیست قبل از حرکت" })).toBeVisible();
  await expect(page.getByTestId("offline-note")).toBeHidden();
  await page.goto(`/trip/${id}/walk`);
  await expect(page.getByTestId("unit")).toBeVisible();

  await ctx.setOffline(true);
  await page.goto(`/trip/${id}`);
  await expect(page.getByRole("heading", { name: "چک‌لیست قبل از حرکت" })).toBeVisible();
  await expect(page.getByTestId("shop-name")).not.toBeEmpty();
  // Honest: a saved copy says so.
  await expect(page.getByTestId("offline-note")).toHaveText("آفلاین — آخرین نسخه‌ی ذخیره‌شده");
  await page.reload();
  await expect(page.getByRole("heading", { name: "چک‌لیست قبل از حرکت" })).toBeVisible();
  await page.goto(`/trip/${id}/walk`);
  await expect(page.getByTestId("unit")).toHaveText(/واحد [۰-۹]+/);
  await expect(page.getByTestId("offline-note")).toBeVisible();

  await page.goto("/about");
  await expect(page.getByRole("heading", { name: /آفلاین/ })).toBeVisible();
  await expect(page.locator('img[src*="mascot-stuck"]')).toBeVisible();
  await ctx.close();
});

test("offline: only the last 3 trips are kept", async ({ browser, request }) => {
  const ids = [];
  for (let i = 0; i < 4; i++) ids.push(await makeTrip(request));
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await controlled(page);
  for (const id of ids) {
    await page.goto(`/trip/${id}`);
    await page.goto(`/trip/${id}/walk`);
  }
  const kept: string[] = await page.evaluate(async () => {
    const c = await caches.open((await caches.keys()).find((k) => k.startsWith("trips-"))!);
    return (await c.keys()).map((r) => new URL(r.url).pathname);
  });
  expect(kept.sort()).toEqual(ids.slice(1).flatMap((id) => [`/trip/${id}`, `/trip/${id}/walk`]).sort());
  await ctx.close();
});
