import { expect, test, type Locator } from "@playwright/test";

// Test runs write no shop_report rows: the report POST is answered here (the app still sees a 200).
test.beforeEach(({ page }) => page.route("**/api/reports", (r) => r.fulfill({ status: 200, json: { id: "test" } })));

// 35 offers; one shop with a null unit (آذرنوش پاکینا), several with declared hours, some closed on Thursdays.
const PRODUCT = "product_a112c972266b57d0f7eddeab";
const FA = "۰۱۲۳۴۵۶۷۸۹";
const ascii = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٬,]/g, "").replace("٫", ".");

/** metres from a row's distance text; Infinity for «فاصله نامشخص». */
async function metres(row: Locator): Promise<number> {
  const t = await row.innerText();
  const m = t.match(/([۰-۹٬٫]+) (متر|کیلومتر)/);
  if (!m) return Infinity;
  return Number(ascii(m[1])) * (m[2] === "کیلومتر" ? 1000 : 1);
}

test.use({ permissions: [] }); // geolocation denied

/** The last Saturday 12:00 Tehran before today: shops declare Saturday hours, so «الان باز» keeps rows at any real hour. */
function lastSaturdayNoon(): Date {
  const d = new Date();
  d.setUTCHours(8, 30, 0, 0); // 12:00 Tehran (+03:30, no DST since 2022), so the UTC weekday is Tehran's
  do d.setUTCDate(d.getUTCDate() - 1);
  while (d.getUTCDay() !== 6);
  return d;
}

test("radar: anchor fallback, sort, open-now filter, missing unit, a failure opens Plan B", async ({ page, request }) => {
  const now = lastSaturdayNoon();
  await page.clock.setSystemTime(now); // time still flows: GSAP's ticker reads Date.now, a frozen clock freezes the sheet
  await page.goto(`/radar/${PRODUCT}`);
  const rows = page.getByRole("list", { name: "فروشگاه‌ها" }).getByRole("listitem");
  await expect(rows.first()).toBeVisible();

  // «موقعیت من» with geolocation denied falls back to Saadi.
  await page.getByRole("button", { name: "موقعیت من" }).click();
  await expect(page.getByText(/فاصله‌ها از مترو سعدی حساب شده/)).toBeVisible();

  // A shop with a null unit says so.
  await expect(rows.filter({ hasText: "آذرنوش پاکینا" })).toContainText("شماره‌ی واحد ثبت نشده");

  // Sort by distance: rows come nearest first, and the order differs from the price order.
  const priceFirst = await rows.first().innerText();
  await page.getByRole("button", { name: "فاصله", exact: true }).click();
  await expect(rows.first()).not.toHaveText(priceFirst);
  const ds = await Promise.all((await rows.all()).map(metres));
  expect(ds).toEqual([...ds].sort((a, b) => a - b));

  // «الان باز» hides a shop that is closed today (Tehran weekday from the API's own hours).
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", weekday: "short" }).format(now).toLowerCase();
  const api = await (await request.get(`/api/products/${PRODUCT}/offers`)).json();
  const closed = api.find((r: { shop: { weekly_hours: Record<string, { status: string }> } }) => r.shop.weekly_hours[day]?.status === "closed");
  const before = await rows.count();
  await page.getByRole("button", { name: /فیلترها/ }).click();
  const filters = page.getByRole("dialog");
  await filters.getByRole("button", { name: "الان باز", exact: true }).click();
  await expect(filters.getByRole("button", { name: "الان باز", exact: true })).toBeFocused(); // a chip tap keeps focus
  await filters.getByRole("button", { name: /دیدن/ }).click();
  await expect(page.getByRole("button", { name: /فیلترها.*۱/ })).toBeVisible();
  if (closed) await expect(rows.filter({ hasText: closed.shop.name })).toHaveCount(0);
  expect(await rows.count()).toBeLessThanOrEqual(before);

  // Open a shop, report «موجود نبود»: a report is posted and Plan B opens.
  await rows.first().getByRole("button").click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("قیمت ثبت‌شده‌ی فروشگاه در ترب")).toBeVisible();
  const report = page.waitForResponse((r) => r.url().includes("/api/reports") && r.request().method() === "POST");
  await sheet.getByRole("button", { name: "موجود نبود" }).click();
  expect((await report).status()).toBe(200);
  await page.waitForURL(/planb=stock/);
  await expect(sheet.getByText("قیمت ثبت‌شده‌ی فروشگاه در ترب")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "پلن B" })).toBeVisible();
});

test("radar: the store sheet takes focus, closes by «بستن», Escape and (phone) a drag down; docks at lg", async ({ page }, info) => {
  await page.goto(`/radar/${PRODUCT}`);
  const rows = page.getByRole("list", { name: "فروشگاه‌ها" }).getByRole("listitem");
  const sheet = page.getByRole("dialog");
  const open = async () => {
    await rows.first().getByRole("button").click();
    await expect(sheet.getByRole("button", { name: "بستن" })).toBeFocused();
  };

  await open();
  const panel = sheet.locator("[data-sheet-panel]");
  if (info.project.name === "desktop") {
    // Docked to the inline-start edge (the right in RTL), full height, 440 px wide.
    await expect.poll(async () => (await panel.boundingBox())?.x).toBe(1440 - 440);
    expect(await panel.boundingBox()).toMatchObject({ y: 0, width: 440, height: 900 });
    await expect(sheet.locator("[data-sheet-handle]")).toBeHidden();
  }
  // Modal: the page behind is inert and Tab wraps inside the sheet.
  // main sits in the page-in wrapper, so its inert comes from an ancestor; the top bar is benched too.
  await expect.poll(() => page.locator("main").evaluate((m) => m.closest("[inert]") != null)).toBe(true);
  await expect(page.locator("header")).toHaveJSProperty("inert", true);
  await page.keyboard.press("Shift+Tab");
  await expect(sheet.getByRole("button", { name: "بستن" })).not.toBeFocused();
  await expect(sheet.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(sheet.getByRole("button", { name: "بستن" })).toBeFocused();

  await sheet.getByRole("button", { name: "بستن" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(rows.first().getByRole("button")).toBeFocused(); // focus returns to the row that opened it
  await expect(page.locator("main")).toHaveJSProperty("inert", false);

  // Filters keep their Sheet mounted: open → close → reopen → close.
  const filtersBtn = page.getByRole("button", { name: /فیلترها/ });
  for (let i = 0; i < 2; i++) {
    await filtersBtn.click();
    await sheet.getByRole("button", { name: "بستن" }).click();
    await expect(sheet).toHaveCount(0);
    await expect(filtersBtn).toBeFocused();
  }

  await open();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);

  if (info.project.name !== "phone") return;
  await open();
  await page.waitForTimeout(400); // the rise
  const handle = (await sheet.locator("[data-sheet-handle]").boundingBox())!;
  const x = handle.x + handle.width / 2;
  const y = handle.y + handle.height / 2;
  // A short, slow drag snaps back.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 60, { steps: 6 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(400);
  await expect(sheet).toBeVisible();
  expect((await sheet.locator("[data-sheet-handle]").boundingBox())!.y).toBeCloseTo(handle.y, 0);
  // A long drag closes it.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 400, { steps: 10 });
  await page.mouse.up();
  await expect(sheet).toHaveCount(0);
});

test("radar (desktop): the map stays beside the list, and the docked sheet leaves the selected pin in view", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "split view is lg only");
  await page.goto(`/radar/${PRODUCT}`);
  const rows = page.getByRole("list", { name: "فروشگاه‌ها" }).getByRole("listitem");
  await expect(rows.first()).toBeVisible();
  const map = page.locator("[data-map]");
  const inView = async () => {
    const b = (await map.boundingBox())!;
    return b.y >= 0 && b.y + b.height <= 900;
  };
  await rows.last().evaluate((li) => li.scrollIntoView({ block: "end" })); // the last row at the bottom edge
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  await expect(rows.last()).toBeInViewport();
  expect(await inView()).toBe(true);

  await rows.last().getByRole("button").click();
  const panel = page.getByRole("dialog").locator("[data-sheet-panel]");
  await expect.poll(async () => (await panel.boundingBox())?.x).toBe(1440 - 440);
  const pin = map.locator('button[aria-pressed="true"]');
  await expect(pin).toBeVisible();
  const [p, s] = [(await pin.boundingBox())!, (await panel.boundingBox())!];
  expect(p.x + p.width).toBeLessThanOrEqual(s.x);
  expect(p.y).toBeGreaterThanOrEqual(0);
  expect(p.y + p.height).toBeLessThanOrEqual(900);
});

test("radar (desktop): every pin lies inside the map box at 1280×720, 1440×900 and 1920×1080", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "fill map is lg only");
  // Two shops near opposite corners of the bbox (8% and 92%): a crop would hide them first.
  await page.route(`**/api/products/${PRODUCT}/offers*`, async (r) => {
    const res = await r.fetch();
    const rows = await res.json();
    Object.assign(rows[0].shop, { lat: 35.7024, lng: 51.4012 });
    Object.assign(rows[1].shop, { lat: 35.6856, lng: 51.4348 });
    await r.fulfill({ response: res, json: rows });
  });
  for (const [width, height] of [[1280, 720], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`/radar/${PRODUCT}`);
    await expect(page.getByRole("list", { name: "فروشگاه‌ها" }).getByRole("listitem").first()).toBeVisible();
    await page.waitForTimeout(700); // the pin drop
    const { pins, out } = await page.evaluate(() => {
      const box = document.querySelector("[data-map-box]")!.getBoundingClientRect();
      const rs = [...document.querySelectorAll("[data-pin] > span")].map((b) => b.getBoundingClientRect());
      return { pins: rs.length, out: rs.filter((r) => r.left < box.left || r.right > box.right || r.top < box.top || r.bottom > box.bottom).length };
    });
    expect(pins, `${width}×${height}`).toBeGreaterThan(0);
    expect(out, `${width}×${height}`).toBe(0);
  }
});

test("radar: every block of the store sheet ends fully opaque (the content stagger never sticks half-way)", async ({ page }) => {
  await page.goto(`/radar/${PRODUCT}`);
  await page.getByRole("list", { name: "فروشگاه‌ها" }).getByRole("listitem").first().getByRole("button").click();
  const sheet = page.getByRole("dialog");
  for (const name of ["برو همین‌جا", /منصفانه/]) {
    const btn = sheet.getByRole("button", { name });
    await expect(btn).toBeVisible();
    // effective opacity: the element and every ancestor up to the sheet
    await expect
      .poll(() => btn.evaluate((el) => { let o = 1; for (let e: Element | null = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; }))
      .toBe(1);
  }
});
