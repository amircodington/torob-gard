import { describe, expect, it } from "vitest";
import { initialState, loadState, reducer, type SessionState } from "./session";

const last = (s: SessionState) => s.chat[s.chat.length - 1];
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
    expect(last(s).chips?.map((c) => c.id)).toEqual(["cat:mobile", "cat:laptop", "cat:accessory", "cat:other"]);
  });

  it("SEED runs the phone-camera conversation to the summary", () => {
    const s = reducer(initialState(), { type: "SEED", seedId: "phone-camera" });
    expect(s.req).toMatchObject({ category: "mobile", budgetId: "m2", priorityId: "camera" });
    expect(last(s).chips?.map((c) => c.id)).toEqual(["go:products"]);
  });
});

describe("loadState", () => {
  it("corrupted JSON falls back to the initial state", () => {
    expect(loadState({ getItem: () => "{not json" })).toEqual(initialState());
  });

  it("valid JSON of the wrong shape falls back too", () => {
    expect(loadState({ getItem: () => "{}" })).toEqual(initialState());
  });

  it("a stored session round-trips", () => {
    const s = askedBudget();
    expect(loadState({ getItem: () => JSON.stringify(s) })).toEqual(s);
  });
});
