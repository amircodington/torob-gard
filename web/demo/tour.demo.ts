import { execSync } from "node:child_process";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { Rec } from "./rec";

// Every feature, in the order a shopper meets them, on the desktop layout. The agent is the real one.
const OUT = path.resolve(__dirname, "../../demo-out");
const WORK = process.env.DEMO_WORK ?? path.join(OUT, "work");
const PHONE = "09121234567"; // a test number: dev mode prints the code to the API log, no SMS is sent

// The demo's own clicks are not shop reports.
test.beforeEach(({ page }) => page.route("**/api/reports", (r) => r.fulfill({ status: 200, json: { id: "demo" } })));

async function agentTurn(page: Page) {
  // a turn in flight shows the thinking radish; it leaves when the answer lands
  await page.waitForTimeout(500);
  await expect(page.locator('main img[src*="think"]')).toHaveCount(0, { timeout: 60_000 });
}

test("tour", async ({ page }) => {
  const r = new Rec(page, WORK);
  await r.start(); // the overlay script must be in place before the first document
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await r.card("ترب‌گرد", "از چی بخرم تا از کجا بخرم! — همراه خرید حضوری در بازار الکترونیک مرکز تهران", 4500);

  // ── 1. Landing
  await r.section("صفحه‌ی اول");
  await r.say("ترب‌گرد یه دوست خرید حضوریه: می‌گه چی بخری، از کدوم مغازه، و اگه نشد چی کار کنی.", 4200);
  await r.scroll(700);
  await r.say("کل مسیر پنج قدمه: مشاوره، میز تصمیم، رادار فروشگاه، پلن B و چک‌لیست راه.", 3800);
  await r.scroll(650);
  await r.say("همه‌ی عددها از داده‌ی ترب/استارکوچه: فروشگاه‌ها، پاساژها و قیمت‌های ثبت‌شده، با تاریخشون.", 3800);
  await r.scroll(1300, 1800);
  await r.say("قول‌های ما: هر قیمت تاریخ داره، «موجود» نمی‌گیم مگه تأیید شده باشه، و چیزی که نمی‌دونیم رو حدس نمی‌زنیم.", 4800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await r.hold(900);

  // ── 2. Consult (real agent)
  await r.section("۱ · مشاوره با دستیار");
  await r.tap(page.getByRole("main").getByRole("link", { name: "شروع کن" }).first());
  await page.waitForURL(/\/start$/, { waitUntil: "commit" });
  await r.say("نیازت رو مثل حرف زدن با یه آدم بنویس؛ دستیار هوش مصنوعی فقط چیزی رو می‌پرسه که هنوز نمی‌دونه.", 3000);
  await r.type(page.getByRole("textbox", { name: "نیاز خرید تو" }), "یه هدفون بی‌سیم برای ورزش می‌خوام، تا ۴ میلیون");
  await r.tap(page.getByRole("button", { name: "ارسال" }));
  await r.say("دستیار جواب رو زنده می‌نویسه و کنارش گزینه‌های آماده می‌ذاره که لازم نباشه تایپ کنی.", 0);
  for (let i = 0; i < 5 && !/\/desk$/.test(page.url()); i++) {
    await agentTurn(page);
    await r.hold(2200);
    if (/\/desk$/.test(page.url())) break;
    const go = page.getByRole("button", { name: /نمایش گزینه‌های مناسب|نمایش گزینه‌ها/ }).first();
    if (await go.isVisible()) {
      await r.tap(go);
      break;
    }
    const chips = page.locator("main").getByRole("group").last().getByRole("button");
    const chip = chips.filter({ hasNot: page.locator("[disabled]") }).first();
    if (i < 4 && (await chip.count()) && (await chip.isEnabled())) await r.tap(chip);
    else await r.tap(page.getByRole("complementary").getByRole("button", { name: /نمایش|گزینه/ }).first());
  }
  await page.waitForURL(/\/desk$/, { timeout: 90_000, waitUntil: "commit" });

  // ── 3. Desk
  await r.section("۲ · میز تصمیم");
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  await r.say("سه مدل، سه استراتژی: اقتصادی، متعادل، امکانات بیشتر — هر کدوم با دلیلش، بر اساس نیازی که گفتی.", 4500);
  await r.say("نیاز تو بالای صفحه می‌مونه؛ بودجه و اولویت رو بدون چت هم می‌شه عوض کرد.", 3500);
  await r.tap(cards.nth(0).getByRole("button", { name: "مقایسه" }));
  await r.tap(cards.nth(1).getByRole("button", { name: "مقایسه" }));
  await r.tap(page.getByRole("button", { name: "باز کردن مقایسه" }));
  await r.say("مقایسه‌ی کنار هم: قیمت، مشخصات کلیدی و تعداد فروشگاه‌ها، ردیف به ردیف.", 4200);
  await r.tap(page.getByRole("dialog").getByRole("button", { name: "بستن" }));
  // the model with the most shops makes the richest radar
  const FA = "۰۱۲۳۴۵۶۷۸۹";
  const shopsOf = async (i: number) => Number(((await cards.nth(i).innerText()).match(/([۰-۹]+) فروشگاه/)?.[1] ?? "0").replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))));
  const counts = [await shopsOf(0), await shopsOf(1), await shopsOf(2)];
  await r.tap(cards.nth(counts.indexOf(Math.max(...counts))).getByRole("button", { name: "انتخاب این مدل" }));

  // ── 4. Radar
  await page.waitForURL(/\/radar\/[^/?]+$/, { waitUntil: "commit" });
  await r.section("۳ · رادار فروشگاه");
  const rows = page.getByRole("list", { name: "فروشگاه‌ها" }).getByRole("listitem");
  await expect(rows.first()).toBeVisible();
  await r.say("مغازه‌هایی که این مدل رو دارن، روی نقشه‌ی بازار، با فاصله از مترو سعدی یا موقعیت خودت.", 4000);
  await r.say("کنار هر قیمت نوشته کِی ثبت شده؛ قیمت قدیمی برچسب «ممکنه عوض شده باشه» می‌گیره.", 3800);
  await r.tap(page.getByRole("button", { name: "فاصله", exact: true }));
  await r.say("مرتب‌سازی با قیمت، فاصله یا تازگی قیمت.", 2400);
  await r.tap(page.getByRole("button", { name: /فیلترها/ }));
  const filters = page.getByRole("dialog");
  await r.say("فیلترها: سقف قیمت، فاصله، «الان باز» و فروش اقساطی — بدون نوشتن حتی یه کلمه.", 4200);
  await r.tap(filters.getByRole("button", { name: /دیدن/ }));
  await expect(rows.first()).toBeVisible();

  // ── 5. Store sheet: price check, simulated follow-up
  await r.section("۳ · کارت فروشگاه");
  await r.tap(rows.first().getByRole("button"));
  const sheet = page.getByRole("dialog");
  await r.say("کارت فروشگاه: قیمت ثبت‌شده با تاریخش، موجودی «نامشخص» تا وقتی کسی تأیید نکرده، آدرس، ساعت کاری، اقساط و تلفن.", 4800);
  await r.tap(sheet.getByRole("button", { name: "این قیمت منصفانه‌ست؟" }));
  const quote = sheet.getByRole("textbox").first();
  const listed = Number((await sheet.getByText(/تومان$/).first().innerText()).replace(/[^۰-۹0-9]/g, "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
  await r.say("فروشنده قیمت دیگه‌ای گفت؟ بزنش؛ با کمترین، میانه و بیشترین قیمت ثبت‌شده‌ی ترب مقایسه می‌شه.", 0);
  await r.type(quote, String(Math.round((listed * 1.12) / 10_000) * 10_000));
  await r.tap(sheet.getByRole("button", { name: /بررسی|چک/ }).first());
  await r.hold(3500);

  await r.say("قدم چهارم بریف: دستیار از طرف تو از فروشنده می‌پرسه. این بخش شبیه‌سازیه و روی صفحه هم همین رو می‌گه.", 1500);
  let planB = false;
  for (let i = 0; i < Math.min(4, await rows.count()) && !planB; i++) {
    if (i > 0) {
      await r.tap(sheet.getByRole("button", { name: "بستن" }));
      await r.tap(rows.nth(i).getByRole("button"));
    }
    const box = sheet.getByTestId("seller-follow-up");
    await box.scrollIntoViewIfNeeded();
    await r.tap(box.getByRole("button", { name: /از طرف من بپرس/ }));
    await expect(box.getByText(/جواب داد|جوابی نیومد/)).toBeVisible();
    const toPlanB = box.getByRole("button", { name: "برو سراغ پلن B" });
    if (await toPlanB.count()) {
      await r.say("این یکی جواب نداد یا جنس نداشت: یه دکمه تا پلن B.", 2600);
      await r.tap(toPlanB);
      planB = true;
    } else await r.say("فروشنده جواب داد: موجودی و قیمت، با ساعت جواب. اگه قیمت فرق کنه، همین‌جا می‌گه چقدر.", 3600);
  }
  if (!planB) {
    await r.say("خودت هم زنگ زدی و جواب ندادن؟ همین دکمه پلن B رو باز می‌کنه.", 1500);
    await r.tap(sheet.getByRole("button", { name: "جواب ندادن" }));
  }

  // ── 6. Plan B
  await r.section("۴ · پلن B");
  const pb = page.getByRole("dialog", { name: "پلن B" });
  await expect(pb).toBeVisible();
  await r.say("پلن B: نیازت سر جاشه، مغازه‌ی ردشده از چرخه خارج می‌شه و بقیه دوباره رتبه‌بندی می‌شن.", 4200);
  await r.tap(pb.getByRole("button", { name: /قیمت مهم‌تره/ }));
  await r.say("بگو چی برات مهم‌تره — قیمت، نزدیکی یا اطمینان — تا ترتیب عوض بشه.", 3200);
  const alt = pb.getByRole("list", { name: "گزینه‌های جایگزین" }).getByRole("listitem").first();
  await r.tap(alt.getByRole("button", { name: "انتخاب این فروشگاه" }));
  await r.hold(1200);
  await r.tap(page.getByRole("dialog").getByRole("button", { name: "برو همین‌جا" }));

  // ── 7. Trip checklist, walk
  await page.waitForURL(/\/trip\/[^/]+$/, { waitUntil: "commit" });
  await r.section("۵ · چک‌لیست راه");
  await r.say("چک‌لیست قبل از حرکت: ساعت کاری، تازگی قیمت، موجودی، واحد و اقساط — هر کدوم با تیک، هشدار یا «نامشخص».", 4800);
  await r.scroll(500);
  await r.say("روایت سفر می‌گه کدوم مغازه رد شد و چرا؛ آدرس رو کپی کن یا مسیر رو توی نشان باز کن.", 4000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await r.hold(700);
  await r.tap(page.getByRole("link", { name: "شروع مسیر" }));
  await page.waitForURL(/\/walk$/, { waitUntil: "commit" });
  await r.say("حالت پیاده‌روی: از ورودی پاساژ تا طبقه و شماره‌ی واحد. واحدی که مطمئن نیستیم «احتمالاً» می‌گیره.", 4800);
  await page.goBack();
  await page.waitForURL(/\/trip\/[^/]+$/, { waitUntil: "commit" });

  // ── 8. Save the trip: phone login
  await r.section("ورود و ذخیره‌ی سفر");
  await r.tap(page.getByRole("button", { name: "ذخیره‌ی سفر" }));
  await r.say("برای ذخیره‌ی سفر فقط شماره‌ی موبایل لازمه؛ شماره رمزنگاری‌شده نگه داشته می‌شه.", 1200);
  const otp = page.getByRole("dialog");
  const since = Math.floor(Date.now() / 1000) - 2;
  // every take asks a code for the same test number: clear the local code-request limits first (dev Redis only)
  execSync(`docker exec torob-gard-redis-1 sh -c "redis-cli --scan --pattern 'otp:n:*' | xargs -r redis-cli del; redis-cli --scan --pattern 'otp:ip:*' | xargs -r redis-cli del; redis-cli --scan --pattern 'otp:lock:*' | xargs -r redis-cli del"`);
  await r.type(otp.getByRole("textbox", { name: /شماره‌ی موبایل/ }), PHONE);
  await r.tap(otp.getByRole("button", { name: "کد رو بفرست" }));
  await expect(otp.getByText(/کد ۵ رقمی/)).toBeVisible();
  const code = await (async () => {
    for (let i = 0; i < 20; i++) {
      const m = execSync(`docker logs torob-gard-api-1 --since ${since} 2>&1`).toString().match(/dev OTP code: (\d{5})/g);
      if (m) return m.at(-1)!.slice(-5);
      await page.waitForTimeout(500);
    }
    throw new Error("no dev OTP code in the API log");
  })();
  await r.say("کد پیامکی رو بزن (اینجا نسخه‌ی توسعه‌ست و کد پیامک نمی‌شه).", 0);
  await r.type(otp.getByRole("textbox").last(), code);
  // a full 5-digit code logs in by itself; the button is only for a code typed short of that
  const login = otp.getByRole("button", { name: "ورود" });
  if (await login.isVisible().catch(() => false)) await r.tap(login).catch(() => {});
  await expect(page.getByText("سفرت ذخیره شد!").first()).toBeVisible({ timeout: 15_000 });
  await r.say("سفر ذخیره شد و از هر گوشی‌ای در دسترسه.", 2800);

  // ── 9. Product page: specs, AI seller notes, product chat
  await r.section("صفحه‌ی محصول");
  await page.goto("/product/product_6c62d575e3d247f6f29e051a", { waitUntil: "domcontentloaded" });
  await r.say("هر محصول صفحه‌ی خودش رو داره: کمترین، میانه و بیشترین قیمت، تاریخ آخرین قیمت و مشخصات.", 4200);
  const notes = page.getByTestId("seller-notes");
  await notes.scrollIntoViewIfNeeded();
  await r.say("نظر خریدار توی داده نیست؛ پس یادداشت‌های خود فروشنده‌ها رو با هوش مصنوعی جمع‌بندی می‌کنیم و می‌گیم ادعای فروشنده‌ست.", 1500);
  await r.tap(notes.getByRole("button", { name: "جمع‌بندی با هوش مصنوعی" }));
  await expect(notes.getByRole("listitem").first()).toBeVisible({ timeout: 40_000 });
  await r.say("اصالت، گارانتی و شرط‌ها در چند خط — بدون قیمت و بدون لینک.", 4500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await r.hold(700);
  await r.tap(page.getByRole("button", { name: "درباره‌ی این محصول بپرس" }));
  await r.say("از همین صفحه درباره‌ی همین محصول بپرس؛ دستیار محصول رو می‌شناسه و بقیه‌ی بازار رو هم می‌گرده.", 1200);
  const chat = page.getByRole("dialog");
  await r.tap(chat.getByRole("button", { name: "یه مدل مشابه ارزون‌تر هم هست؟" }));
  await page.waitForTimeout(500);
  await expect(chat.locator('img[src*="think"]')).toHaveCount(0, { timeout: 60_000 });
  await r.hold(5000);
  await r.tap(chat.getByRole("button", { name: "بستن" }));

  // ── 10. Search, pasazh, shop
  await r.section("جستجو، پاساژ و مغازه");
  await r.tap(page.getByRole("link", { name: "جستجو" }).first());
  await page.waitForURL(/\/search/, { waitUntil: "commit" });
  await r.say("جستجو با فارسی یا انگلیسی، با «۱۳» یا «13»: مدل، برند، مغازه یا پاساژ.", 0);
  await r.type(page.getByRole("searchbox", { name: "نام مدل یا مغازه" }), "علاالدین");
  await page.keyboard.press("Enter");
  await page.waitForURL(/q=/, { waitUntil: "commit" });
  await r.hold(2500);
  await r.say("نتیجه‌ها: مغازه‌هایی که اسمشون یا پاساژشون می‌خوره.", 2600);
  await r.tap(page.locator('main a[href^="/shop/"]').first());
  await page.waitForURL(/\/shop\//, { waitUntil: "commit" });
  await r.say("صفحه‌ی مغازه: جا، ساعت کاری و پیشنهادهاش با تاریخ قیمت؛ خریدارها می‌تونن بگن بسته بود، جواب نداد یا جنس داشت.", 4800);
  await r.scroll(500);
  await r.tap(page.locator('main a[href^="/pasazh/"]').first());
  await page.waitForURL(/\/pasazh\//, { waitUntil: "commit" });
  await r.say("صفحه‌ی پاساژ: مغازه‌ها طبقه به طبقه؛ طبقه‌ی نامعلوم آخر می‌آد و صادقانه «ثبت نشده» نوشته می‌شه.", 4200);
  await r.scroll(600);
  await r.hold(1500);

  // ── 11. Me: trips and saved chats
  await r.section("صفحه‌ی من");
  await page.goto("/me", { waitUntil: "domcontentloaded" });
  await r.say("صفحه‌ی من: سفرهای ذخیره‌شده، گفتگوهای قبلی با دستیار، و چیزهایی که دستیار از گفتگوها فهمیده — قابل ویرایش و پاک کردن.", 4800);
  await r.scroll(500);
  const saved = page.getByRole("link").filter({ hasText: /پرسش ·/ }).first();
  if (await saved.count()) {
    await r.tap(saved);
    await page.waitForURL(/\/start/, { waitUntil: "commit" });
    await r.say("یه گفتگوی قبلی دوباره باز می‌شه و از همون‌جا ادامه پیدا می‌کنه.", 3800);
  }
  await r.card("ترب‌گرد", "از چی بخرم تا از کجا بخرم! — <b>torob-gard</b>", 4000);

  const list = await r.finish(OUT);
  execSync(
    `ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -vf "scale=1920:1200:flags=lanczos,format=yuv420p" -fps_mode cfr -r 30 ` +
      `-c:v libx264 -crf 20 -preset medium -movflags +faststart "${path.join(OUT, "torob-gard-demo.mp4")}"`,
  );
});
