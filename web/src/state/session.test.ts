import { describe, expect, it } from "vitest";
import { agentNeed, initialState, loadState, reducer, stagePath, type SessionState } from "./session";

const last = (s: SessionState) => s.chat[s.chat.length - 1];
const ALL_CATS = ["mobile", "laptop", "tablet", "tv", "headphone", "powerbank", "photo", "accessory", "other"] as const;
const chip = (s: SessionState, id: string) => {
  const c = last(s).chips?.find((x) => x.id === id);
  if (!c) throw new Error(`no chip ${id} in: ${last(s).text}`);
  return c;
};
const askedBudget = () => reducer(initialState(), { type: "CHAT_TEXT", text: "یه گوشی برای عکاسی می‌خوام" });

describe("consult reducer", () => {
  it("free text with a phone detects mobile and asks the budget with chips", () => {
    const s = askedBudget();
    expect(s.req.category).toBe("mobile");
    expect(last(s).from).toBe("assistant");
    expect(last(s).text).toContain("بودجه");
    expect(last(s).chips?.map((c) => c.id)).toContain("budget:m2");
    expect(last(s).chips?.map((c) => c.id)).not.toContain("skip:budget"); // «مهم نیست» band already says it
  });

  it("an accessory for a phone is an accessory, not a phone", () => {
    const s = reducer(initialState(), { type: "CHAT_TEXT", text: "شارژر گوشی می‌خوام" });
    expect(s.req.category).toBe("accessory");
  });

  it.each([
    ["تلویزیون ۵۵ اینچ می‌خوام", "tv"],
    ["یه هدفون بی‌سیم خوب", "headphone"],
    ["هندزفری برای ورزش", "headphone"],
    ["پاوربانک ۲۰ هزار", "powerbank"],
    ["تبلت برای بچه", "tablet"],
    ["دوربین عکاسی بدون آینه", "photo"],
    ["یه گوشی برای عکاسی", "mobile"],
    ["شارژر گوشی", "accessory"],
  ])("«%s» detects %s", (text, cat) => {
    expect(reducer(initialState(), { type: "CHAT_TEXT", text }).req.category).toBe(cat);
  });

  it("every desk category asks its own budget and priorities", () => {
    for (const cat of ALL_CATS.filter((c) => c !== "other")) {
      let s = reducer(initialState(), { type: "CHAT_CHIP", chip: { id: `cat:${cat}`, label: cat } });
      expect(s.req.category).toBe(cat);
      const band = last(s).chips?.find((c) => c.id.startsWith("budget:"));
      expect(band, cat).toBeTruthy();
      s = reducer(s, { type: "CHAT_CHIP", chip: band! });
      const prios = last(s).chips?.filter((c) => c.id.startsWith("prio:")) ?? [];
      expect(prios.length, cat).toBeGreaterThanOrEqual(2);
    }
  });

  it("one agent session for the whole chat: a fresh id at the start, a new one after RESET", () => {
    const s = initialState();
    expect(s.agentSessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(reducer(s, { type: "RESET" }).agentSessionId).not.toBe(s.agentSessionId);
  });

  it("agentNeed turns band and priority ids into what the agent can read", () => {
    const req = { category: "laptop", goalText: "لپ‌تاپ", budgetId: "l2", priorityId: "weight", customBudget: null } as const;
    expect(agentNeed(req)).toEqual({
      category: "laptop", goal: "لپ‌تاپ", budget_min: 180_000_000, budget_max: 240_000_000,
      budget_label: "۱۸۰ تا ۲۴۰ میلیون", priority: "weight", priority_label: "سبکی و حمل راحت",
    });
    expect(agentNeed({ ...req, budgetId: "l5" })).toMatchObject({ budget_min: 0, budget_max: null });
    expect(agentNeed({ ...req, category: null, budgetId: null, priorityId: null })).toEqual({ goal: "لپ‌تاپ" });
  });

  it("RESET starts a new chat epoch, so a late answer from the old chat can be told apart", () => {
    const s = reducer(askedBudget(), { type: "RESET" });
    expect(s.epoch).toBe(askedBudget().epoch + 1);
    expect(s.chat).toHaveLength(1);
  });

  it("Arabic yeh («گوشي») still detects mobile", () => {
    const s = reducer(initialState(), { type: "CHAT_TEXT", text: "گوشي" });
    expect(s.req.category).toBe("mobile");
  });

  it("HYDRATE with the page stage: the URL owns the stage, the furthest stage is kept", () => {
    const stored = { ...askedBudget(), stage: "products" as const, maxStage: "products" as const };
    const s = reducer(initialState(), { type: "HYDRATE", state: stored, stage: "consult" });
    expect(s.stage).toBe("consult");
    expect(s.maxStage).toBe("products");
    expect(s.chat).toEqual(stored.chat);
  });

  it("HYDRATE with the page product: the URL owns the product and a new product starts clean", () => {
    const stored: SessionState = {
      ...initialState(), stage: "radar", maxStage: "radar", selectedProductId: "X", selectedStoreId: "s1",
      chosenStoreId: "s1", failures: [{ storeId: "s1", reason: "stock", at: 1 }],
    };
    const s = reducer(initialState(), { type: "HYDRATE", state: stored, stage: "radar", productId: "Y" });
    expect(s.selectedProductId).toBe("Y");
    expect(s.failures).toEqual([]);
    expect(s.chosenStoreId).toBeNull();
    expect(s.selectedStoreId).toBeNull();
    const same = reducer(initialState(), { type: "HYDRATE", state: stored, stage: "radar", productId: "X" });
    expect(same.failures).toHaveLength(1); // same product: the trip's history stays
  });

  it("budget chip moves to the priority question", () => {
    const s0 = askedBudget();
    const s = reducer(s0, { type: "CHAT_CHIP", chip: chip(s0, "budget:m2") });
    expect(s.req.budgetId).toBe("m2");
    expect(last(s).chips?.map((c) => c.id)).toContain("prio:camera");
  });

  it("priority chip gives the summary with go:products", () => {
    let s = askedBudget();
    s = reducer(s, { type: "CHAT_CHIP", chip: chip(s, "budget:m2") });
    s = reducer(s, { type: "CHAT_CHIP", chip: chip(s, "prio:camera") });
    expect(s.req.priorityId).toBe("camera");
    expect(last(s).text).toContain("جمع‌بندی");
    expect(last(s).chips?.map((c) => c.id)).toEqual(["go:products"]);
  });

  it("free-text budget «۱۵ تا ۲۵» becomes a custom band and moves to priority", () => {
    const s = reducer(askedBudget(), { type: "CHAT_TEXT", text: "۱۵ تا ۲۵" });
    expect(s.req.customBudget).toMatchObject({ min: 15_000_000, max: 25_000_000 });
    expect(last(s).chips?.map((c) => c.id)).toContain("prio:camera");
  });

  it("ASCII digits with a dash and «میلیون» parse too", () => {
    const s = reducer(askedBudget(), { type: "CHAT_TEXT", text: "15-25 میلیون" });
    expect(s.req.customBudget).toMatchObject({ min: 15_000_000, max: 25_000_000 });
  });

  it("unknown category text gets the clarify message with category chips", () => {
    const s = reducer(initialState(), { type: "CHAT_TEXT", text: "چراغ آشپزخانه" });
    expect(s.req.category).toBeNull();
    expect(last(s).chips?.map((c) => c.id)).toEqual(ALL_CATS.map((c) => `cat:${c}`));
  });

  it("SEED runs the phone-camera conversation to the summary", () => {
    const s = reducer(initialState(), { type: "SEED", seedId: "phone-camera" });
    expect(s.req).toMatchObject({ category: "mobile", budgetId: "m2", priorityId: "camera" });
    expect(last(s).chips?.map((c) => c.id)).toEqual(["go:products"]);
  });
});

describe("loadState", () => {
  it("corrupted JSON falls back to the initial state", () => {
    expect(loadState({ getItem: () => "{not json" })).toEqual({ ...initialState(), agentSessionId: expect.any(String) });
  });

  it("valid JSON of the wrong shape falls back too", () => {
    expect(loadState({ getItem: () => "{}" })).toEqual({ ...initialState(), agentSessionId: expect.any(String) });
  });

  it("a stored session round-trips", () => {
    const s = askedBudget();
    expect(loadState({ getItem: () => JSON.stringify(s) })).toEqual(s);
  });
});

describe("trip reducer", () => {
  const mine = [{ storeId: "s1", reason: "closed" as const, at: 1 }];
  const theirs = [{ storeId: "s9", reason: "stock" as const, at: 2 }];

  it("TRIP_CREATED sets the trip id and adopts a shared trip's failures", () => {
    const s = reducer({ ...initialState(), failures: mine }, { type: "TRIP_CREATED", id: "t2", failures: theirs });
    expect(s.tripId).toBe("t2");
    expect(s.failures).toEqual(theirs);
  });
  it("TRIP_CREATED for the same trip keeps the session's own failures", () => {
    const s = reducer({ ...initialState(), tripId: "t1", failures: mine }, { type: "TRIP_CREATED", id: "t1", failures: theirs });
    expect(s.tripId).toBe("t1");
    expect(s.failures).toEqual(mine);
  });
  it("SELECT_PRODUCT and RESET clear the trip id", () => {
    const withTrip = { ...initialState(), tripId: "t1" };
    expect(reducer(withTrip, { type: "SELECT_PRODUCT", id: "p2" }).tripId).toBeNull();
    expect(reducer(withTrip, { type: "SELECT_PRODUCT", id: "p2", advance: true }).tripId).toBeNull();
    expect(reducer(withTrip, { type: "RESET" }).tripId).toBeNull();
  });
  it("stagePath: step ۴ leads to the saved trip, and nowhere before one exists", () => {
    expect(stagePath({ ...initialState(), stage: "summary", tripId: "t1" })).toBe("/trip/t1");
    expect(stagePath({ ...initialState(), stage: "summary" })).toBeNull();
  });
});
