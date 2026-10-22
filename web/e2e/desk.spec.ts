import { expect, test } from "@playwright/test";

test("desk: agent text swaps in place after the templates", async ({ page }) => {
  await page.route("**/agent/explain", async (r) => {
    const { tiers } = r.request().postDataJSON();
    const t = tiers[0];
    await r.fulfill({ json: { [t.product_id]: { bullets: t.bullets, tradeoffs: t.tradeoffs, fit_note: "متن تستیِ ایجنت" } } });
  });
  await page.goto("/start?seed=phone-camera");
  await page.getByText("جمع‌بندی نیازهات").waitFor();
  await page.getByRole("button", { name: "نمایش گزینه‌های مناسب" }).click();
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByText("متن تستیِ ایجنت")).toBeVisible();
});

test("desk: three tiers, compare tray, pick goes to the radar", async ({ page }) => {
  await page.route("**/agent/explain", (r) => r.abort()); // agent down: templates stay
  await page.goto("/start?seed=phone-camera");
  await page.getByText("جمع‌بندی نیازهات").waitFor();
  // Desktop: the consult's summary rail beside the chat.
  if (test.info().project.name === "desktop")
    await expect(page.getByRole("complementary", { name: "نیاز تو تا اینجا" }).getByText("اولویت: دوربین مهم‌تره")).toBeVisible();
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

  // The compare sheet stays mounted between opens: it must close again on the second open.
  const opener = page.getByRole("button", { name: "باز کردن مقایسه" });
  const compare = page.getByRole("dialog", { name: /مقایسه/ });
  for (let i = 0; i < 2; i++) {
    await opener.click();
    await compare.getByRole("button", { name: "بستن" }).click();
    await expect(compare).toHaveCount(0);
    await expect(opener).toBeFocused();
  }

  await cards.nth(1).getByRole("button", { name: "انتخاب این مدل" }).click();
  await page.waitForURL(/\/radar\//);
});
