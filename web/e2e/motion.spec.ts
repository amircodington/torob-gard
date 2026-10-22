import { expect, test, type Page } from "@playwright/test";

const PRODUCT = "product_a112c972266b57d0f7eddeab";
const style = (page: Page, sel: string) =>
  page.locator(sel).first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { opacity: s.opacity, translate: s.translate, transform: s.transform, animation: s.animationName };
  });

async function toDesk(page: Page) {
  await page.route("**/agent/explain", (r) => r.abort()); // templates are enough here
  await page.goto("/start?seed=phone-camera");
  await page.getByText("جمع‌بندی نیازهات").waitFor();
  await page.getByRole("button", { name: "نمایش گزینه‌های مناسب" }).click();
  await page.waitForURL(/\/desk$/);
  await page.getByRole("article").first().waitFor();
}

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  // Reduced motion keeps a short opacity fade (gentler, not zero) and drops all movement.
  test("desk cards and radar rows do not move; the store sheet does not slide", async ({ page }) => {
    await toDesk(page);
    const card = await style(page, "article");
    expect(card.translate).toBe("none");
    expect(card.animation).not.toBe("rise");
    await expect.poll(async () => (await style(page, "article")).opacity).toBe("1");

    await page.goto(`/radar/${PRODUCT}`);
    const rowSel = '[aria-label="فروشگاه‌ها"] > li';
    await page.locator(rowSel).first().waitFor();
    const row = await style(page, rowSel);
    expect(row.translate).toBe("none");
    expect(row.animation).not.toBe("rise");
    await expect.poll(async () => (await style(page, rowSel)).opacity).toBe("1");

    await page.locator(rowSel).first().getByRole("button").first().click();
    await page.locator("[data-sheet-panel]").waitFor();
    await page.waitForTimeout(50);
    expect((await style(page, "[data-sheet-panel]")).transform).toBe("none");
  });
});

test("without reduced motion the desk card rises", async ({ page }) => {
  await toDesk(page);
  expect((await style(page, "article")).animation).toBe("rise");
});
