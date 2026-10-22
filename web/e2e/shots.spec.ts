import { expect, test, type Page } from "@playwright/test";

// Visual check for each redesign task: SHOTS=<task> pnpm exec playwright test shots --project=phone --project=desktop
test.skip(!process.env.SHOTS, "set SHOTS=<task> to take screenshots");
test.beforeEach(({ page }) => page.route("**/api/reports", (r) => r.fulfill({ status: 200, json: { id: "test" } })));
test.beforeEach(({ page }) => page.route("**/agent/chat", (r) => r.abort()));
test.use({ permissions: [] });

const PRODUCT = "product_a112c972266b57d0f7eddeab";

/** fullPage for scrolling pages; overlays (sheet, Plan B) are fixed, so they get the viewport. */
async function shot(page: Page, name: string, fullPage = true) {
  const project = test.info().project.name;
  await page.screenshot({ path: `../docs/evidence/redesign/${process.env.SHOTS}/${project}-${name}.png`, fullPage, animations: "disabled" });
}

test("shots: journey", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await shot(page, "landing");

  await page.goto("/start?seed=phone-camera");
  await page.getByText("جمع‌بندی نیازهات").waitFor();
  await shot(page, "start");

  await page.getByRole("button", { name: "نمایش گزینه‌های مناسب" }).click();
  await page.waitForURL(/\/desk$/);
  await expect(page.getByRole("article")).toHaveCount(3);
  await shot(page, "desk");

  await page.getByRole("article").filter({ hasText: "متعادل و مناسب نیاز" }).getByRole("button", { name: "انتخاب این مدل" }).click();
  await page.waitForURL(/\/radar\/[^/?]+$/);
  const rows = page.getByRole("list", { name: "فروشگاه‌ها" }).getByRole("listitem");
  await expect(rows.first()).toBeVisible();
  await shot(page, "radar");

  await rows.first().getByRole("button").click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("button", { name: "بسته بود" })).toBeVisible();
  await page.waitForTimeout(500); // the sheet's GSAP rise
  await shot(page, "sheet", false);

  await sheet.getByRole("button", { name: "بسته بود" }).click();
  await expect(page.getByRole("dialog", { name: "پلن B" })).toBeVisible();
  await page.waitForTimeout(300);
  await shot(page, "planb", false);
  await page.getByRole("dialog", { name: "پلن B" }).getByRole("button", { name: /نزدیکی مهم‌تره/ }).click();
  await page.waitForTimeout(400); // the Flip re-rank (320 ms)
  await shot(page, "planb-ranked", false);
});

test("shots: trip, walk, 404", async ({ page, request }) => {
  // trip.spec's makeTrip: a shop with a known unit for this product.
  const offers: { shop: { id: string; unit: string | null } }[] = await (await request.get(`/api/products/${PRODUCT}/offers`)).json();
  const shop = offers.find((o) => o.shop.unit != null)!.shop;
  const res = await request.post("/api/trips", {
    data: { product_id: PRODUCT, chosen_shop_id: shop.id, req: { category: "mobile" }, failures: [], anchor: { lat: 35.6907, lng: 51.413 } },
  });
  const { id } = await res.json();

  await page.goto(`/trip/${id}`);
  await expect(page.getByRole("heading", { name: "چک‌لیست قبل از حرکت" })).toBeVisible();
  await shot(page, "trip");

  await page.goto(`/trip/${id}/walk`);
  await expect(page.getByTestId("unit")).toBeVisible();
  await page.waitForTimeout(500);
  await shot(page, "walk");
  await page.getByRole("button", { name: "پیداش کردم" }).click();
  await page.getByRole("button", { name: "آره" }).click();
  await page.waitForTimeout(700); // the success moment (600 ms)
  await shot(page, "walk-success", false);

  await page.goto("/nope");
  await shot(page, "404");
});
