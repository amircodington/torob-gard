import { expect, test } from "@playwright/test";

test("landing: CTAs, live numbers, pasazh strip, no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "شروع کن" })).toHaveAttribute("href", "/start");
  await expect(page.getByRole("link", { name: "سناریوی آماده" })).toHaveAttribute("href", "/start?seed=phone-camera");

  await expect(page.getByTestId("live-numbers")).toContainText(/[۰-۹]/);
  await expect(page.getByTestId("pasazh-strip").getByRole("listitem")).toHaveCount(12);

  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
});

test("404 shows the stuck mascot and a way home", async ({ page }) => {
  await page.goto("/nope");
  await expect(page.getByText("این صفحه پیدا نشد")).toBeVisible();
  await expect(page.locator("main img")).toHaveAttribute("src", /stuck/);
  await expect(page.getByRole("link", { name: "برگشت به خانه" })).toHaveAttribute("href", "/");
});
