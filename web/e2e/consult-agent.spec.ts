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
  await page.getByRole("button", { name: "عکاسی", exact: true }).click();
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

test("«شروع دوباره» mid-turn: the chat unlocks at once and the old turn's late answer never lands", async ({ page }) => {
  let release: () => void = () => {};
  let calls = 0;
  await page.route("**/agent/chat", async (r) => {
    if (++calls === 1) await new Promise<void>((res) => (release = res)); // a slow BoxAPI turn
    return r.fulfill({ status: 200, contentType: "text/event-stream",
      body: sse(["token", { text: calls === 1 ? "جواب قدیمی" : "تلویزیون؛ بودجه‌ات چقدره؟" }], done) }).catch(() => {});
  });
  await page.goto("/start");
  await say(page, "یه گوشی می‌خوام");
  const box = page.getByRole("textbox", { name: "نیاز خرید تو" });
  await box.fill("هنوز منتظرم");
  await expect(page.getByRole("button", { name: "ارسال" })).toBeDisabled(); // locked while the turn is in flight
  await page.getByRole("button", { name: "گفتگوی جدید" }).click();
  await expect(page.getByRole("button", { name: "گفتگوی جدید" })).toHaveCount(0); // a fresh chat has nothing to leave
  await box.fill("هنوز منتظرم");
  await expect(page.getByRole("button", { name: "ارسال" })).toBeEnabled({ timeout: 2000 });
  await expect(page.getByText("یه گوشی می‌خوام")).toHaveCount(0);
  release();
  await say(page, "تلویزیون می‌خوام");
  await expect(page.getByText("تلویزیون؛ بودجه‌ات چقدره؟")).toBeVisible();
  await expect(page.getByText("جواب قدیمی")).toHaveCount(0);
  await expect(box).toBeEnabled();
});

test("history: a logged-in user reopens a saved chat and the next turn goes to its agent session", async ({ page }) => {
  const SID = "22222222-2222-2222-2222-222222222222";
  await page.route("**/api/me/chats", (r) => r.fulfill({ json: [{ id: SID, title: "یه هدفون بی‌سیم", last_at: "2026-10-20T10:00:00Z", turns: 1 }] }));
  await page.route(`**/api/me/chats/${SID}`, (r) => r.fulfill({ json: { id: SID, messages: [
    { from: "user", text: "یه هدفون بی‌سیم", blocks: [] },
    { from: "assistant", text: "بودجه‌ت چقدره؟", blocks: [{ type: "ask", question: "بودجه‌ت چقدره؟", options: ["تا ۲ میلیون"] }] },
  ] } }));
  const bodies = await agent(page, [sse(["token", { text: "باشه، تا ۲ میلیون." }], done)]);
  await page.goto("/start");
  await page.getByText("گفتگوهای قبلی").click();
  await page.getByRole("button", { name: /یه هدفون بی‌سیم/ }).click();
  await expect(page.getByText("بودجه‌ت چقدره؟")).toHaveCount(1);
  await page.getByRole("button", { name: "تا ۲ میلیون" }).click();
  await expect(page.getByText("باشه، تا ۲ میلیون.")).toBeVisible();
  expect(bodies[0]).toMatchObject({ text: "تا ۲ میلیون", session_id: SID });
});

test("product page: ask about this product in a sheet; the agent gets the product, its answer and chips show", async ({ page }) => {
  const bodies = await agent(page, [
    sse(["token", { text: "کمترین قیمتش رو تو رادار ببین. مشابه ارزون‌تر هم می‌خوای؟" }],
      ["block", { type: "ask", question: "مشابه ارزون‌تر هم می‌خوای؟", options: ["آره"] }], done),
    sse(["token", { text: "این دو تا ارزون‌ترن." }], done),
  ]);
  await page.goto(`/product/${PRODUCT}`);
  await page.getByRole("button", { name: "درباره‌ی این محصول بپرس" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "کجا ارزون‌تر پیداش می‌کنم؟" }).click();
  await expect(sheet.getByText("کمترین قیمتش رو تو رادار ببین.", { exact: false })).toBeVisible();
  await sheet.getByRole("button", { name: "آره" }).click();
  await expect(sheet.getByText("این دو تا ارزون‌ترن.")).toBeVisible();
  expect(bodies[0]).toMatchObject({ text: "کجا ارزون‌تر پیداش می‌کنم؟", context: { stage: "product", product_id: PRODUCT } });
  expect(bodies[1]).toMatchObject({ text: "آره", session_id: "11111111-1111-1111-1111-111111111111" });
  await expect(page).toHaveURL(new RegExp(`/product/${PRODUCT}$`)); // never leaves for the desk
});

test("product page: the sellers' notes summed up on demand, labelled as the sellers' claims", async ({ page }) => {
  const NOTED = "product_6c62d575e3d247f6f29e051a"; // a phone whose sellers wrote notes (dev DB)
  let calls = 0;
  await page.route("**/agent/seller_notes", (r) => {
    calls++;
    return r.fulfill({ json: { points: ["بیشتر فروشنده‌ها می‌گن پلمپ و اصله", "بعضی‌ها گارانتی ۱۸ ماهه دارن"], notes: 12 } });
  });
  await page.goto(`/product/${NOTED}`);
  const card = page.getByTestId("seller-notes");
  await expect(card).toContainText("نه نظر خریدارها");
  expect(calls).toBe(0); // nothing is spent until the shopper asks
  await card.getByRole("button", { name: "جمع‌بندی با هوش مصنوعی" }).click();
  await expect(card.getByRole("listitem")).toHaveCount(2);
  await expect(card).toContainText("خلاصه با هوش مصنوعی از یادداشت ۱۲ پیشنهاد");
});

test("product page: no notes card for a product whose sellers wrote nothing", async ({ page }) => {
  await page.goto("/product/product_4a071fb47603b709cff158f3"); // dev DB: no seller wrote a note or a warranty
  await expect(page.getByRole("heading", { name: "مشخصات" })).toBeVisible();
  await expect(page.getByTestId("seller-notes")).toHaveCount(0);
});

test("the 2026-10-23 headphone chat: the agent's need survives a failed turn; the fallback goes on to priority", async ({ page }) => {
  let calls = 0;
  await page.route("**/agent/chat", (r) => (++calls === 1
    ? r.fulfill({ status: 200, contentType: "text/event-stream", body: sse(
      ["token", { text: "حتماً! بودجه‌ت برای هدفون حدوداً چقدره؟" }],
      ["block", { type: "ask", question: "کدوم بازه به بودجه‌ت نزدیک‌تره؟", options: ["تا ۲ میلیون", "۲ تا ۱۰ میلیون"] }],
      ["done", { message_id: "m", receipt_ids: [], session_id: "11111111-1111-1111-1111-111111111111", need: { category: "headphone" } }]) })
    : r.abort()));
  await page.goto("/start");
  await say(page, "میخوام هدفون بگیرم");
  await expect(page.getByText("کدوم بازه به بودجه‌ت نزدیک‌تره؟")).toBeVisible();
  await say(page, "۵ میلیون تومن تا ۷ تومن");
  await expect(page.getByRole("button", { name: "موبایل" })).toHaveCount(1); // only the welcome's, not asked again
  await expect(page.getByRole("button", { name: /نویز/ }).first()).toBeVisible(); // headphone priorities
});
