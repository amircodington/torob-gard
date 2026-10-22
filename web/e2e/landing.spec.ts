import { expect, test } from "@playwright/test";

test("landing: CTAs, live numbers, pasazh strip, no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  const main = page.getByRole("main"); // the site header repeats «شروع کن» from md up
  await expect(main.getByRole("link", { name: "شروع کن" })).toHaveAttribute("href", "/start");
  await expect(main.getByRole("link", { name: "سناریوی آماده" })).toHaveAttribute("href", "/start?seed=phone-camera");

  await expect(page.getByTestId("live-numbers")).toContainText(/[۰-۹]/);
  const pasazh = page.getByTestId("pasazh-strip").getByRole("listitem");
  await expect(pasazh).toHaveCount(12);
  await expect(pasazh.locator("[data-bar]")).toHaveCount(12);

  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("404 shows the stuck mascot and a way home", async ({ page }) => {
  await page.goto("/nope");
  await expect(page.getByText("این صفحه پیدا نشد")).toBeVisible();
  await expect(page.locator("main img")).toHaveAttribute("src", /stuck/);
  await expect(page.getByRole("link", { name: "برگشت به خانه" })).toHaveAttribute("href", "/");
});

test("the wordmark links home from the landing and the journey", async ({ page }) => {
  for (const path of ["/", "/about", "/desk"]) {
    await page.goto(path);
    await expect(page.getByRole("banner").getByRole("link", { name: "ترب‌گرد", exact: true })).toHaveAttribute("href", "/");
  }
});

test.describe("desktop shell", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("the hero uses the width: CTA and mascot share a row", async ({ page }) => {
    await page.goto("/");
    const cta = await page.getByRole("main").getByRole("link", { name: "شروع کن" }).boundingBox();
    const mascot = await page.locator('main img[src*="wave"]').boundingBox();
    expect(cta!.y).toBeLessThan(mascot!.y + mascot!.height);
    expect(cta!.y + cta!.height).toBeGreaterThan(mascot!.y);
  });
  test("step labels are visible text; the top bar spans the content width", async ({ page }) => {
    await page.goto("/desk");
    const nav = page.getByRole("navigation", { name: "مراحل خرید" });
    await expect(nav.getByText("میز تصمیم")).toBeVisible();
    await expect(nav.locator('[aria-current="step"] [data-step-num]')).toHaveText("۲");
    const bar = await page.getByRole("banner").locator(".page").boundingBox();
    expect(bar!.width).toBeGreaterThan(1100);
  });
});
