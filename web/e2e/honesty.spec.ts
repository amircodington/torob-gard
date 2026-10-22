import { expect, test, type Page } from "@playwright/test";

// Honesty rules (PLAN §2) stay visible on every layout: runs on phone, tablet and desktop.
test.beforeEach(({ page }) => page.route("**/api/reports", (r) => r.fulfill({ status: 200, json: { id: "test" } })));
test.use({ permissions: [] });

const PRODUCT = "product_a112c972266b57d0f7eddeab";
const CREDIT = "محصول رسمی ترب نیست";

const credit = (page: Page) => expect(page.getByRole("contentinfo").getByText(CREDIT)).toBeVisible();

test("honesty: landing credit", async ({ page }) => {
  await page.goto("/");
  await credit(page);
});

test("honesty: every desk card shows the lowest price's age", async ({ page }) => {
  await page.goto("/start?seed=phone-camera");
  await page.getByRole("button", { name: "نمایش گزینه‌های مناسب" }).click();
  await page.waitForURL(/\/desk$/);
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) await expect(card.getByText(/کمترین قیمت: (به‌روزرسانی|زمانش ثبت نشده)/)).toBeVisible();
  await credit(page);
});

test("honesty: every radar row shows price age and stock; hedges are visible", async ({ page }) => {
  await page.goto(`/radar/${PRODUCT}`);
  const rows = page.getByRole("list", { name: "فروشگاه‌ها" }).getByRole("listitem");
  await expect(rows.first()).toBeVisible();
  for (const row of await rows.all()) {
    await expect(row.getByText(/به‌روزرسانی/)).toBeVisible();
    await expect(row.getByText(/موجودی (نامشخص|تأییدشده)/)).toBeVisible();
    for (const hedge of [/احتمالاً/, /ثبت نشده/]) {
      const h = row.getByText(hedge);
      if (await h.count()) await expect(h.first()).toBeVisible();
    }
  }
  await credit(page);
});
