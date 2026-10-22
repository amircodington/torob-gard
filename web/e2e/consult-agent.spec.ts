import { expect, test, type Page, type Route } from "@playwright/test";

// The agent is mocked: a canned SSE body per turn, so no run ever reaches BoxAPI.
const PRODUCT = "product_a112c972266b57d0f7eddeab";
const sse = (...events: [string, unknown][]) => events.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join("");
const done = ["done", { message_id: "m", receipt_ids: [], session_id: "11111111-1111-1111-1111-111111111111" }] as [string, unknown];

test.beforeEach(({ page }) => page.route("**/agent/explain", (r) => r.abort())); // never BoxAPI

async function agent(page: Page, turns: string[]) {
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/agent/chat", (r: Route) => {
    bodies.push(r.request().postDataJSON());
    return r.fulfill({ status: 200, contentType: "text/event-stream", body: turns[bodies.length - 1] });
  });
  return bodies;
}

async function say(page: Page, text: string) {
  await page.getByRole("textbox", { name: "نیاز خرید تو" }).fill(text);
  await page.getByRole("button", { name: "ارسال" }).click();
}

test("consult via the agent: ask chips → desk", async ({ page }) => {
  const bodies = await agent(page, [
    sse(["status", { text: "دارم نیازت رو می‌فهمم…" }], ["token", { text: "گوشی برای چه کاری؟" }],
      ["block", { type: "ask", question: "گوشی برای چه کاری؟", options: ["عکاسی", "بازی"] }], done),
    sse(["token", { text: "باشه، سه گزینه برات آوردم." }],
      ["block", { type: "desk", category: "mobile", budget_min: 5_000_000, budget_max: 50_000_000, priority: "camera" }], done),
  ]);
  await page.goto("/start");
  await say(page, "یه گوشی می‌خوام");
  await expect(page.getByText("گوشی برای چه کاری؟")).toHaveCount(1); // the ask's question is not said twice
  await page.getByRole("button", { name: "عکاسی" }).click();
  await page.waitForURL(/\/desk$/);
  await expect(page.getByRole("article")).toHaveCount(3);
  expect(bodies[0]).toMatchObject({ text: "یه گوشی می‌خوام", context: { stage: "consult" } });
  expect(bodies[1]).toMatchObject({ text: "عکاسی", session_id: "11111111-1111-1111-1111-111111111111" });
});

test("shop cards in chat open the radar sheet; the price check marks the quote", async ({ page, request }) => {
  const offers = await (await request.get(`/api/products/${PRODUCT}/offers`)).json();
  await agent(page, [sse(["token", { text: "این دو تا رو ببین:" }],
    ["block", { type: "shop_cards", shop_ids: [offers[0].shop.id], offer_ids: [offers[0].offer_id, offers[1].offer_id], why: { [offers[0].shop.id]: "ارزون‌ترین" } }], done)]);
  await page.route("**/agent/price_check", (r) => r.fulfill({ json: {
    product_id: PRODUCT, min: 100_000, median: 120_000, max: 150_000, verdict: "high", pct_vs_median: 25,
    newest_price_at: "2020-01-01T00:00:00Z", offer_ids: [], cheaper_nearby: [] } }));
  await page.goto("/start");
  await say(page, "از کجا بخرم؟");
  const cards = page.getByRole("list", { name: "فروشگاه‌های پیشنهادی" }).getByRole("listitem");
  await expect(cards).toHaveCount(2);
  await expect(page.getByText("ارزون‌ترین")).toBeVisible();
  await cards.first().getByRole("button").click();

  await page.waitForURL(new RegExp(`/radar/${PRODUCT}$`));
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: offers[0].shop.name })).toBeVisible();
  await sheet.getByRole("button", { name: "این قیمت منصفانه‌ست؟" }).click();
  await sheet.getByRole("textbox", { name: /قیمتی که فروشنده گفت/ }).fill("۱۵۰۰۰۰");
  await sheet.getByRole("button", { name: "بررسی" }).click();
  const result = sheet.getByRole("status");
  await expect(result).toContainText("۲۵٪ بالاتر از میانه");
  await expect(result).toContainText("ممکن است تغییر کرده باشد"); // a 2020 price is stale
});

test("agent down: the rule reducer answers, the banner shows once, the next turn tries the agent again", async ({ page }) => {
  let calls = 0;
  await page.route("**/agent/chat", (r) => (++calls <= 2 ? r.abort() : r.fulfill({
    status: 200, contentType: "text/event-stream", body: sse(["token", { text: "برگشتم! دوربین یا باتری؟" }], done) })));
  await page.goto("/start");
  const banner = page.getByText("دستیار هوشمند موقتاً در دسترس نیست");
  await say(page, "گوشی برای عکاسی");
  await expect(banner).toBeVisible();
  await expect(page.getByRole("button", { name: "۵ تا ۵۰ میلیون" })).toBeVisible();
  await say(page, "۱۰ تا ۲۰");
  await expect(page.getByRole("button", { name: /دوربین مهم‌تره/ })).toBeVisible();
  await expect(banner).toHaveCount(1);
  await say(page, "دوربین");
  await expect(page.getByText("برگشتم! دوربین یا باتری؟")).toBeVisible();
  await expect(banner).toHaveCount(0);
  expect(calls).toBe(3);
});
