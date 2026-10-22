import { expect, test } from "@playwright/test";

test("desk: three tiers, compare tray, pick goes to the radar", async ({ page }) => {
  await page.goto("/start?seed=phone-camera");
  await page.getByText("جمع‌بندی نیازهات").waitFor();
  await page.getByRole("button", { name: "نمایش گزینه‌های مناسب" }).click();
  await page.waitForURL(/\/desk$/);

  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  for (const label of ["اقتصادی", "متعادل و مناسب نیاز", "امکانات بیشتر"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }

  await cards.nth(0).getByRole("button", { name: "مقایسه" }).click();
  await cards.nth(1).getByRole("button", { name: "مقایسه" }).click();
  await expect(page.getByText("۲ مدل")).toBeVisible();

  await cards.nth(1).getByRole("button", { name: "انتخاب این مدل" }).click();
  await page.waitForURL(/\/radar\//);
});
