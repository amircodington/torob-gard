import { expect, test, type Locator, type Page } from "@playwright/test";

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

// Hover and press (Task 4 micro-interactions). A mouse device: hover lifts only where (hover: hover) matches.
// No fixed waits: motion is polled to its end value. Under reduced motion the hover shadow (kept there) is the signal
// that the hover took effect; the press has no such signal, so the test waits for :active and then reads both the
// scale and the element's running transitions (reading computed style flushes them, so a started scale shows up).
const ROW = '[aria-label="فروشگاه‌ها"] > li button';
const css = (l: Locator, prop: "translate" | "scale" | "boxShadow") => () => l.evaluate((el, p) => getComputedStyle(el)[p], prop);
const LIFT_SHADOW = "rgba(238, 138, 42, 0.16)";

async function openRow(page: Page) {
  await page.goto(`/radar/${PRODUCT}`);
  const row = page.locator(ROW).first();
  await row.waitFor();
  return row;
}
async function releaseOff(page: Page) {
  await page.mouse.move(0, 0); // off the row: no click, no sheet
  await page.mouse.up();
}

test.describe("hover and press on a mouse device", () => {
  test.use({ isMobile: false, hasTouch: false });

  test("a shop row lifts 2px on hover and presses to 0.99; a forward arrow nudges toward the reading direction", async ({ page }) => {
    const row = await openRow(page);
    await row.hover();
    await expect.poll(css(row, "translate")).toBe("0px -2px");
    await page.mouse.down();
    await expect.poll(css(row, "scale")).toBe("0.99");
    await releaseOff(page);

    await toDesk(page);
    const pick = page.getByRole("button", { name: "انتخاب این مدل" }).first();
    await pick.hover();
    await expect.poll(css(pick.locator("svg.nudge"), "translate")).toBe("-2px");
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });
    test("no transform on hover or press: the row stays put, the button's arrow does not nudge", async ({ page }) => {
      const row = await openRow(page);
      await row.hover();
      await expect.poll(css(row, "boxShadow")).toContain(LIFT_SHADOW); // hovered, transitions settled
      expect(await css(row, "translate")()).toBe("none");
      await page.mouse.down();
      await expect.poll(() => row.evaluate((el) => el.matches(":active"))).toBe(true);
      const pressed = await row.evaluate((el) => ({
        scale: getComputedStyle(el).scale,
        moving: el.getAnimations().map((a) => (a as CSSTransition).transitionProperty).filter((p) => p === "scale" || p === "translate"),
      }));
      expect(pressed).toEqual({ scale: "none", moving: [] });
      await releaseOff(page);

      await toDesk(page);
      const pick = page.getByRole("button", { name: "انتخاب این مدل" }).first();
      await pick.hover();
      await expect.poll(css(pick, "boxShadow")).toContain(LIFT_SHADOW);
      expect(await css(pick, "translate")()).toBe("none");
      expect(await css(pick.locator("svg.nudge"), "translate")()).toBe("none");
    });
  });
});

test("without reduced motion the desk card rises", async ({ page }) => {
  await toDesk(page);
  expect((await style(page, "article")).animation).toBe("rise");
});

// ponytail: the route loaders (app/**/loading.tsx) are not e2e-tested on their own: the dev server does not prefetch
// the loading boundary and the catalog pages fetch server-side, so a slow route cannot be made deterministic here.
// Loader.test covers the 150 ms delay; this covers the same Skeleton on a slow client fetch.
test("slow data: the radar shows card skeletons after the delay, then the rows", async ({ page }) => {
  await page.route("**/api/products/*/offers*", async (r) => {
    await new Promise((x) => setTimeout(x, 1500));
    await r.fallback();
  });
  await page.goto(`/radar/${PRODUCT}`);
  // .last(): the route loader's copy may still be in the DOM for a moment beside the page's own.
  const busy = page.locator('[aria-busy="true"]');
  await expect(busy.last().locator("[data-skeleton]").first()).toBeVisible();
  // shown after the 150 ms delay (opacity 0 until then), then fully
  await expect.poll(() => busy.last().evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  await expect(page.locator('[aria-label="فروشگاه‌ها"] > li').first()).toBeVisible();
  await expect(busy).toHaveCount(0);
});
