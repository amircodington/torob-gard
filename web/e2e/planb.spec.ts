import { expect, test, type Locator } from "@playwright/test";

// Test runs write no shop_report rows: the report POST is answered here (the app still sees a 200).
test.beforeEach(({ page }) => page.route("**/api/reports", (r) => r.fulfill({ status: 200, json: { id: "test" } })));

const PRODUCT = "product_a112c972266b57d0f7eddeab";
const FA = "۰۱۲۳۴۵۶۷۸۹";
const ascii = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٬,]/g, "").replace("٫", ".");
const price = async (card: Locator) => Number(ascii(await card.getByText(/^[۰-۹٬]+ تومان$/).innerText()).replace(/\D/g, ""));
async function metres(card: Locator): Promise<number> {
  const m = (await card.innerText()).match(/([۰-۹٬٫]+) (متر|کیلومتر)/);
  return m ? Number(ascii(m[1])) * (m[2] === "کیلومتر" ? 1000 : 1) : Infinity;
}

test.use({ permissions: [] });

test("plan B: fail a shop, re-rank by price then distance, every shop failed → diagnosis", async ({ page, request }) => {
  await page.goto(`/radar/${PRODUCT}`);
  const rows = page.getByRole("list", { name: "فروشگاه‌ها" }).getByRole("listitem");
  // A 1 km cap: Plan B ranks every offer, so its farthest pick is one the radar list hides.
  await page.getByRole("button", { name: /فیلترها/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "۱ کیلومتر", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: /دیدن/ }).click();
  await rows.first().getByRole("button").click();
  await page.getByRole("dialog").getByRole("button", { name: "موجود نبود" }).click();
  await page.waitForURL(/planb=stock/);

  const planB = page.getByRole("dialog", { name: "پلن B" });
  await expect(planB.getByText("موجودی تأیید نشد")).toBeVisible();
  await expect(planB.getByText("حالا بگو چی برات مهم‌تره:")).toBeVisible();
  // Back closes it; Forward brings it back from the URL alone.
  await page.goBack();
  await expect(planB).toHaveCount(0);
  await page.goForward();
  await expect(planB.getByText("موجودی تأیید نشد")).toBeVisible();

  const cards = planB.getByRole("list", { name: "گزینه‌های جایگزین" }).getByRole("listitem");
  await planB.getByRole("button", { name: /قیمت مهم‌تره/ }).click();
  await expect(cards.first()).toBeVisible();
  const prices = await Promise.all((await cards.all()).map(price));
  expect(prices[0]).toBe(Math.min(...prices));
  const firstByPrice = await cards.first().getByRole("heading").innerText();

  await planB.getByRole("button", { name: /نزدیکی مهم‌تره/ }).click();
  await expect(cards.first().getByRole("heading")).not.toHaveText(firstByPrice);
  const ds = await Promise.all((await cards.all()).map(metres));
  expect(ds[0]).toBe(Math.min(...ds));

  // Accept a shop the 1 km filter hides: the overlay closes, the param goes, its sheet still opens.
  const far = cards.last();
  expect(await metres(far)).toBeGreaterThan(1000);
  const farName = await far.getByRole("heading").innerText();
  await far.getByRole("button", { name: "انتخاب این فروشگاه" }).click();
  await expect(planB).toHaveCount(0);
  await expect(page).not.toHaveURL(/planb=/);
  await expect(page.getByRole("dialog").getByRole("heading", { name: farName })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "بستن" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Every shop failed: write the failures into the stored session and reload with the param.
  const offers: { shop: { id: string } }[] = await (await request.get(`/api/products/${PRODUCT}/offers`)).json();
  await page.evaluate((ids) => {
    const s = JSON.parse(sessionStorage.getItem("torobgard-session-v2")!);
    s.failures = ids.map((storeId) => ({ storeId, reason: "stock", at: 0 }));
    sessionStorage.setItem("torobgard-session-v2", JSON.stringify(s));
  }, offers.map((o) => o.shop.id));
  await page.goto(`/radar/${PRODUCT}?planb=stock`);
  await expect(page.getByText("گزینه‌ی جایگزینی نموند")).toBeVisible();
  await page.getByRole("button", { name: "برگشت به میز تصمیم" }).click();
  await page.waitForURL(/\/desk/);
});
