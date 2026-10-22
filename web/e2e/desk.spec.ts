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

test("desk (desktop): the three price boxes line up, before and after the agent text swaps in", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "the columns exist at lg only");
  let release = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route("**/agent/explain", async (r) => {
    const { tiers } = r.request().postDataJSON();
    await held;
    // A much longer fit note on one card only: the price boxes must not move apart.
    const long = "این متن عمداً بلند است تا ببینیم ردیف قیمت‌ها جابه‌جا نمی‌شود. ".repeat(4);
    await r.fulfill({ json: { [tiers[0].product_id]: { bullets: tiers[0].bullets, tradeoffs: tiers[0].tradeoffs, fit_note: long } } });
  });
  await page.goto("/start?seed=phone-camera");
  await page.getByRole("button", { name: "نمایش گزینه‌های مناسب" }).click();
  await expect(page.getByRole("article")).toHaveCount(3);
  const tops = async () => {
    // Measure once the cards' stagger + rise have finished, not after a guessed delay.
    await page.getByRole("article").evaluateAll((els) => Promise.all(els.flatMap((e) => e.getAnimations().map((a) => a.finished))));
    return page.locator("[data-price-box]").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
  };
  const near = (xs: number[]) => expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(2);
  const before = await tops();
  expect(before).toHaveLength(3);
  near(before);
  release();
  await expect(page.getByText("ردیف قیمت‌ها جابه‌جا").first()).toBeVisible();
  const after = await tops();
  near(after);
  expect(Math.abs(after[0] - before[0])).toBeLessThanOrEqual(2);
});
