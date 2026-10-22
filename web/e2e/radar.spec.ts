import { expect, test, type Locator } from "@playwright/test";

// 35 offers; one shop with a null unit (آذرنوش پاکینا), several with declared hours, some closed on Thursdays.
const PRODUCT = "product_a112c972266b57d0f7eddeab";
const FA = "۰۱۲۳۴۵۶۷۸۹";
const ascii = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٬,]/g, "").replace("٫", ".");

/** metres from a row's distance text; Infinity for «فاصله نامشخص». */
async function metres(row: Locator): Promise<number> {
  const t = await row.innerText();
  const m = t.match(/([۰-۹٬٫]+) (متر|کیلومتر)/);
  if (!m) return Infinity;
  return Number(ascii(m[1])) * (m[2] === "کیلومتر" ? 1000 : 1);
}

test.use({ permissions: [] }); // geolocation denied

test("radar: anchor fallback, sort, open-now filter, missing unit, a failure opens Plan B", async ({ page, request }) => {
  await page.goto(`/radar/${PRODUCT}`);
  const rows = page.getByRole("list", { name: "فروشگاه‌ها" }).getByRole("listitem");
  await expect(rows.first()).toBeVisible();

  // «موقعیت من» with geolocation denied falls back to Saadi.
  await page.getByRole("button", { name: "موقعیت من" }).click();
  await expect(page.getByText(/فاصله‌ها از مترو سعدی حساب شده/)).toBeVisible();

  // A shop with a null unit says so.
  await expect(rows.filter({ hasText: "آذرنوش پاکینا" })).toContainText("شماره‌ی واحد ثبت نشده");

  // Sort by distance: rows come nearest first, and the order differs from the price order.
  const priceFirst = await rows.first().innerText();
  await page.getByRole("button", { name: "فاصله", exact: true }).click();
  await expect(rows.first()).not.toHaveText(priceFirst);
  const ds = await Promise.all((await rows.all()).map(metres));
  expect(ds).toEqual([...ds].sort((a, b) => a - b));

  // «الان باز» hides a shop that is closed today (Tehran weekday from the API's own hours).
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", weekday: "short" }).format(new Date()).toLowerCase();
  const api = await (await request.get(`/api/products/${PRODUCT}/offers`)).json();
  const closed = api.find((r: { shop: { weekly_hours: Record<string, { status: string }> } }) => r.shop.weekly_hours[day]?.status === "closed");
  const before = await rows.count();
  await page.getByRole("button", { name: /فیلترها/ }).click();
  const filters = page.getByRole("dialog");
  await filters.getByRole("button", { name: "الان باز", exact: true }).click();
  await expect(filters.getByRole("button", { name: "الان باز", exact: true })).toBeFocused(); // a chip tap keeps focus
  await filters.getByRole("button", { name: /دیدن/ }).click();
  await expect(page.getByRole("button", { name: /فیلترها.*۱/ })).toBeVisible();
  if (closed) await expect(rows.filter({ hasText: closed.shop.name })).toHaveCount(0);
  expect(await rows.count()).toBeLessThanOrEqual(before);

  // Open a shop, report «موجود نبود»: a report is posted and Plan B opens.
  await rows.first().getByRole("button").click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("قیمت ثبت‌شده‌ی فروشگاه در ترب")).toBeVisible();
  const report = page.waitForResponse((r) => r.url().includes("/api/reports") && r.request().method() === "POST");
  await sheet.getByRole("button", { name: "موجود نبود" }).click();
  expect((await report).status()).toBe(200);
  await page.waitForURL(/planb=stock/);
  await expect(sheet).toHaveCount(0);
});
