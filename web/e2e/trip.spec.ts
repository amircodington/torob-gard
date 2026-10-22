import { expect, test, type APIRequestContext } from "@playwright/test";

const PRODUCT = "product_a112c972266b57d0f7eddeab";

async function makeTrip(request: APIRequestContext, unit: "known" | "null"): Promise<string> {
  const offers: { shop: { id: string; unit: string | null } }[] = await (await request.get(`/api/products/${PRODUCT}/offers`)).json();
  const shop = offers.find((o) => (unit === "known" ? o.shop.unit != null : o.shop.unit == null))!.shop;
  const res = await request.post("/api/trips", {
    data: { product_id: PRODUCT, chosen_shop_id: shop.id, req: { category: "mobile" }, failures: [], anchor: { lat: 35.6907, lng: 51.413 } },
  });
  expect(res.ok()).toBe(true);
  return (await res.json()).id;
}

test.use({ permissions: [] });

test("trip: shared link renders the checklist, walk shows the unit, «اینجا نیست» opens Plan B", async ({ browser, request }) => {
  const id = await makeTrip(request, "known");
  const ctx = await browser.newContext(); // fresh: no sessionStorage
  const page = await ctx.newPage();
  await page.goto(`/trip/${id}`);
  await expect(page.getByRole("heading", { name: "چک‌لیست قبل از حرکت" })).toBeVisible();
  await expect(page.getByTestId("product-title")).not.toBeEmpty();
  await expect(page.getByTestId("shop-name")).not.toBeEmpty();
  await expect(page.getByRole("list", { name: "چک‌لیست" }).getByRole("listitem").first()).toBeVisible();
  await expect(page.getByText("از مترو سعدی")).toBeVisible();
  await expect(page.getByRole("link", { name: "باز کردن مسیر در نقشه" })).toHaveAttribute("href", /^https:\/\/neshan\.org\/maps\/@/);

  await page.getByRole("link", { name: "شروع مسیر" }).click();
  await page.waitForURL(new RegExp(`/trip/${id}/walk$`));
  await expect(page.getByTestId("unit")).toHaveText(/واحد [۰-۹]+/);

  await page.getByRole("button", { name: "اینجا نیست" }).click();
  await page.waitForURL(/planb=closed/);
  const planB = page.getByRole("dialog", { name: "پلن B" });
  await expect(planB).toBeVisible();

  // Accepting patches the trip; the checklist (SSR) now shows the new shop.
  await planB.getByRole("button", { name: /قیمت مهم‌تره/ }).click();
  const pick = planB.getByRole("list", { name: "گزینه‌های جایگزین" }).getByRole("listitem").first();
  const name = await pick.getByRole("heading").innerText();
  await pick.getByRole("button", { name: "انتخاب این فروشگاه" }).click();
  await page.waitForURL(new RegExp(`/trip/${id}$`));
  await expect(page.getByTestId("shop-name")).toHaveText(name);
  await expect(page.getByText("فروشگاه بسته است", { exact: false })).toBeVisible();
  await ctx.close();
});

test("trip: walk mode names a missing unit instead of leaving it blank", async ({ page, request }) => {
  const id = await makeTrip(request, "null");
  await page.goto(`/trip/${id}/walk`);
  await expect(page.getByTestId("unit")).toContainText("شماره‌ی واحد ثبت نشده");
});

test("trip: unknown id → 404", async ({ page }) => {
  const res = await page.goto("/trip/trip_doesnotexist");
  expect(res?.status()).toBe(404);
});
