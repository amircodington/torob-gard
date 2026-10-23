import { expect, test, type Page } from "@playwright/test";

// Real dev DB (make ingest): the honesty spec's product and the biggest «علاءالدین ۲» key.
const PRODUCT = "product_a112c972266b57d0f7eddeab";
const PASAZH = "علالدین2";
const API = process.env.API_URL ?? "http://localhost:8000";

test.beforeEach(({ page }) => page.route("**/api/reports", (r) => r.fulfill({ status: 200, json: { id: "test" } })));

const jsonLd = async (page: Page) =>
  JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);

const noSideScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

test("pasazh page lists its floors, unknown floor last, with SEO", async ({ page }) => {
  await page.goto(`/pasazh/${encodeURIComponent(PASAZH)}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("علاالدین");
  const floors = page.getByTestId("floor");
  expect(await floors.count()).toBeGreaterThan(2);
  await expect(floors.last().getByRole("heading")).toHaveText("طبقه نامشخص");
  await expect(floors.first().getByRole("link").first()).toHaveAttribute("href", /^\/shop\//);
  expect((await jsonLd(page))["@type"]).toBe("ShoppingCenter");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/pasazh\//);
  await noSideScroll(page);
});

test("product page: min/median/max in Persian digits, price age, radar CTA", async ({ page }) => {
  await page.goto(`/product/${PRODUCT}`);
  const range = page.getByTestId("price-range");
  for (const l of ["کمترین", "میانه", "بیشترین"]) await expect(range.getByText(l, { exact: true })).toBeVisible();
  await expect(range).toContainText(/[۰-۹]/);
  await expect(range).not.toContainText(/[0-9]/);
  await expect(page.getByText(/کمترین قیمت: به‌روزرسانی/)).toBeVisible();
  await expect(page.getByRole("link", { name: "پیدا کردن فروشگاه" })).toHaveAttribute("href", `/radar/${PRODUCT}`);
  const ld = await jsonLd(page);
  expect([ld["@type"], ld.offers["@type"], ld.offers.priceCurrency]).toEqual(["Product", "AggregateOffer", "IRR"]);
  await noSideScroll(page);
});

test("category page from the product: price range, pasazhs, models", async ({ page }) => {
  await page.goto(`/product/${PRODUCT}`);
  await page.getByRole("navigation", { name: "مسیر" }).getByRole("link").click();
  await page.waitForURL(/\/c\//);
  await expect(page.getByTestId("price-range")).toContainText(/[۰-۹]/);
  await expect(page.getByTestId("top-venues").getByRole("link").first()).toHaveAttribute("href", /^\/pasazh\//);
  await expect(page.getByTestId("products").getByRole("link").first()).toHaveAttribute("href", /^\/product\//);
  await noSideScroll(page);
});

test("shop page: place, offers with price age, three report buttons", async ({ page, request }) => {
  const venue = await (await request.get(`${API}/api/venues/${encodeURIComponent(PASAZH)}`)).json();
  const shop = venue.floors[0].shops[0];
  await page.goto(`/shop/${shop.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(shop.name);
  expect((await jsonLd(page))["@type"]).toBe("Store");
  const reports = page.getByTestId("reports").getByRole("button");
  await expect(reports).toHaveCount(3);
  await reports.first().click();
  await expect(page.getByTestId("reports")).toContainText("ممنون");
  await noSideScroll(page);
});

test("a shop, product, pasazh or category that no longer exists is the 404 page", async ({ page }) => {
  for (const path of ["/shop/missing", "/product/missing", "/pasazh/missing", "/c/missing"]) {
    const res = await page.goto(path);
    expect(res!.status()).toBe(404);
    await expect(page.getByText("این صفحه پیدا نشد")).toBeVisible();
  }
});

test("search: spelling variants, honest empty state, noindex; robots lists sitemaps", async ({ page, request }) => {
  await page.goto(`/search?q=${encodeURIComponent("ایفون ۱۳")}`);
  await expect(page.getByTestId("search-products").getByRole("link").first()).toHaveAttribute("href", /^\/product\//);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto(`/search?q=${encodeURIComponent("علاءالدین")}`);
  await expect(page.getByTestId("search-shops").getByRole("link").first()).toHaveAttribute("href", /^\/shop\//);
  await noSideScroll(page);
  await page.goto("/search?q=zzqqxx");
  await expect(page.getByRole("heading", { name: /پیدا نشد/ })).toBeVisible();
  expect(await (await request.get("/robots.txt")).text()).toMatch(/Sitemap: .*\/sitemap\/0\.xml/);
});
