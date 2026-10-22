import { expect, test, type Page } from "@playwright/test";

// Test runs write no shop_report rows: the report POST is answered here (the app still sees a 200).
test.beforeEach(({ page }) => page.route("**/api/reports", (r) => r.fulfill({ status: 200, json: { id: "test" } })));
// The desk's agent rewrite never reaches BoxAPI from e2e; the P1 templates stay.
test.beforeEach(({ page }) => page.route("**/agent/explain", (r) => r.abort()));
// The rule reducer's path: the agent is unreachable here (consult-agent.spec covers the agent).
test.beforeEach(({ page }) => page.route("**/agent/chat", (r) => r.abort()));

const FA = "۰۱۲۳۴۵۶۷۸۹";

/** The stage is in step `n` of the TopBar, and the page never scrolls sideways. */
async function stage(page: Page, n: number) {
  await expect(page.getByRole("navigation", { name: "مراحل خرید" }).locator('[aria-current="step"] [data-step-num]')).toHaveText(FA[n]);
  const [scroll, vw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(vw);
}

test.use({ permissions: [] }); // geolocation denied → distances from the Saadi anchor

test("journey: landing → chat → desk → radar → closed → Plan B → trip → walk", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "شروع کن" }).click();
  await page.waitForURL(/\/start$/);
  await stage(page, 1);

  // The real chat, the same answers the phone-camera seed replays.
  await page.getByRole("textbox", { name: "نیاز خرید تو" }).fill("گوشی برای عکاسی");
  await page.getByRole("button", { name: "ارسال" }).click();
  await page.getByRole("button", { name: "۵ تا ۵۰ میلیون" }).click();
  await page.getByRole("button", { name: /دوربین مهم‌تره/ }).click();
  await expect(page.getByText("جمع‌بندی نیازهات")).toBeVisible();
  await page.getByRole("button", { name: "نمایش گزینه‌های مناسب" }).click();

  await page.waitForURL(/\/desk$/);
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  await stage(page, 2);
  await cards.filter({ hasText: "متعادل و مناسب نیاز" }).getByRole("button", { name: "انتخاب این مدل" }).click();

  await page.waitForURL(/\/radar\/[^/?]+$/);
  const rows = page.getByRole("list", { name: "فروشگاه‌ها" }).getByRole("listitem");
  await expect(rows.first()).toBeVisible();
  await stage(page, 3);
  await page.getByRole("button", { name: "فاصله", exact: true }).click();
  await expect(page.getByRole("button", { name: "فاصله", exact: true })).toHaveAttribute("aria-pressed", "true");
  await rows.first().getByRole("button").click();

  const report = page.waitForResponse((r) => r.url().includes("/api/reports") && r.request().method() === "POST");
  await page.getByRole("dialog").getByRole("button", { name: "بسته بود" }).click();
  expect((await report).ok()).toBe(true);
  await page.waitForURL(/planb=closed/);
  const planB = page.getByRole("dialog", { name: "پلن B" });
  await expect(planB).toBeVisible();
  await stage(page, 3);

  await planB.getByRole("button", { name: /اطمینان بیشتر مهمه/ }).click();
  const pick = planB.getByRole("list", { name: "گزینه‌های جایگزین" }).getByRole("listitem").first();
  const name = await pick.getByRole("heading").innerText();
  await pick.getByRole("button", { name: "انتخاب این فروشگاه" }).click();
  await expect(planB).toHaveCount(0);
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name })).toBeVisible();

  const trip = page.waitForResponse((r) => r.url().includes("/api/trips") && r.request().method() === "POST");
  await sheet.getByRole("button", { name: "برو همین‌جا" }).click();
  expect((await trip).ok()).toBe(true);
  await page.waitForURL(/\/trip\/[^/]+$/);
  await expect(page.getByTestId("product-title")).not.toBeEmpty();
  await expect(page.getByTestId("shop-name")).toHaveText(name);
  await expect(page.getByRole("list", { name: "چک‌لیست" }).getByRole("listitem").first()).toBeVisible();
  await stage(page, 4);

  await page.getByRole("link", { name: "شروع مسیر" }).click();
  await page.waitForURL(/\/trip\/[^/]+\/walk$/);
  await expect(page.getByTestId("unit")).toHaveText(/واحد [۰-۹]+|ثبت نشده/);
  await stage(page, 4);
});
