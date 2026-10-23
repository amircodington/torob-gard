import { expect, test } from "@playwright/test";

test("landing: CTAs, live numbers, pasazh strip, no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  const main = page.getByRole("main"); // the site header repeats «شروع کن» from md up
  await expect(main.getByRole("link", { name: "شروع کن" })).toHaveCount(2); // the hero and the closing band
  for (const l of await main.getByRole("link", { name: "شروع کن" }).all()) await expect(l).toHaveAttribute("href", "/start");
  await expect(main.getByRole("link", { name: "سناریوی آماده" })).toHaveAttribute("href", "/start?seed=phone-camera");

  await expect(page.getByTestId("live-numbers")).toContainText(/[۰-۹]/);
  const pasazh = page.getByTestId("pasazh-strip").getByRole("listitem");
  await expect(pasazh).toHaveCount(12);
  await expect(pasazh.locator("[data-bar]")).toHaveCount(12);

  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

// Redesign 2: no section may sit faded waiting for an animation (phone, tablet and desktop projects).
const opacity = (el: Element) => {
  let o = 1;
  for (let e: Element | null = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
  return o;
};
test("landing: every section heading is visible at full opacity after load and scroll", async ({ page }) => {
  await page.goto("/");
  const headings = page.getByRole("main").getByRole("heading", { level: 2 });
  await expect(headings).toHaveCount(8);
  for (const h of await headings.all()) {
    await h.scrollIntoViewIfNeeded();
    await expect(h).toBeVisible();
    expect(await h.evaluate(opacity)).toBe(1); // at once: headings never animate
  }
  // Revealed blocks may rise as they scroll in, but end fully visible.
  for (const block of await page.locator("[data-reveal] > *").all()) await expect.poll(() => block.evaluate(opacity)).toBe(1);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("landing: revealed blocks are at full opacity at once", async ({ page }) => {
    await page.goto("/");
    const blocks = page.locator("[data-reveal] > *");
    expect(await blocks.count()).toBeGreaterThan(20);
    for (const block of await blocks.all()) {
      await block.scrollIntoViewIfNeeded();
      expect(await block.evaluate(opacity)).toBe(1); // no poll: nothing may fade in
    }
  });
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
    const cta = await page.getByRole("main").getByRole("link", { name: "شروع کن" }).first().boundingBox();
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
