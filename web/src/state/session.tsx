"use client";

/* Shopping-session state, ported from the prototype (docs/torob-gard-ux-prototype/src/state/session.tsx).
 * The reducer stays pure; the provider mirrors state to sessionStorage and pushes the route on stage change. */

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { BUDGETS, PRIORITIES, SEEDS } from "../config/journey";
import { normalize, toAsciiDigits, toFaDigits } from "../lib/persian";
import type {
  BudgetBand,
  Category,
  ChatMsg,
  FailReason,
  FailureRecord,
  RadarFilters,
  RecoveryPriority,
  Requirements,
  SortKey,
} from "../lib/types";

export type Stage = "consult" | "products" | "radar" | "summary";
export type RadarView = "map" | "list";

export interface Chip {
  id: string;
  label: string;
  hint?: string;
}

export interface Msg extends ChatMsg {
  chips?: Chip[];
  shopCards?: { offerIds: string[]; why: Record<string, string> }; // the agent's shop_cards block
}

/** budgetId "custom" means the band was typed («۱۵ تا ۲۵») and lives in customBudget. */
export interface JourneyReq extends Requirements {
  customBudget: BudgetBand | null;
}

export interface SessionState {
  stage: Stage;
  maxStage: Stage;
  chat: Msg[];
  req: JourneyReq;
  selectedProductId: string | null;
  compare: string[];
  filters: RadarFilters;
  sort: SortKey;
  radarView: RadarView;
  selectedStoreId: string | null; // open detail sheet
  chosenStoreId: string | null; // the plan
  failures: FailureRecord[];
  planB: { open: boolean; reason: FailReason | null; priority: RecoveryPriority | null };
  previousPlan: { storeId: string } | null;
  summaryJustReady: boolean;
  tripId: string | null; // the saved trip (/trip/[id]); Plan B patches it
  agentSessionId: string | null;
  agentOffline: boolean; // the last turn fell back to the rule reducer (banner); every turn still tries the agent
  epoch: number; // bumped by RESET: a turn started before it is dropped (start/page.tsx)
}

export const STAGE_ORDER: Stage[] = ["consult", "products", "radar", "summary"];
const later = (a: Stage, b: Stage): Stage => (STAGE_ORDER.indexOf(a) >= STAGE_ORDER.indexOf(b) ? a : b);

let mid = 1;
const nextId = () => mid++;

const CATEGORY_CHIPS: Chip[] = [
  { id: "cat:mobile", label: "موبایل" },
  { id: "cat:laptop", label: "لپ‌تاپ" },
  { id: "cat:tablet", label: "تبلت" },
  { id: "cat:tv", label: "تلویزیون" },
  { id: "cat:headphone", label: "هدفون" },
  { id: "cat:powerbank", label: "پاوربانک" },
  { id: "cat:photo", label: "دوربین عکاسی" },
  { id: "cat:accessory", label: "لوازم جانبی" },
  { id: "cat:other", label: "چیز دیگه" },
];

const GREETING: Msg = {
  id: 0,
  from: "assistant",
  text: "سلام! من ترب‌گردم — همراهت برای خرید حضوری، از «چی بخرم» تا «از کجا بخرم».\nچی می‌خوای بخری؟",
  chips: CATEGORY_CHIPS,
};

export const initialState = (): SessionState => ({
  stage: "consult",
  maxStage: "consult",
  chat: [GREETING],
  req: { category: null, goalText: "", budgetId: null, priorityId: null, customBudget: null },
  selectedProductId: null,
  compare: [],
  filters: { maxPrice: null, maxDistanceKm: null, openNow: false, installment: false },
  sort: "price",
  radarView: "list", // phones open on the list; md+ shows map and list together
  selectedStoreId: null,
  chosenStoreId: null,
  failures: [],
  planB: { open: false, reason: null, priority: null },
  previousPlan: null,
  summaryJustReady: false,
  tripId: null,
  agentSessionId: null,
  agentOffline: false,
  epoch: 0,
});

/* ----------------------------- actions ----------------------------- */

export type Action =
  | { type: "CHAT_TEXT"; text: string }
  | { type: "CHAT_CHIP"; chip: Chip }
  | { type: "GO"; stage: Stage }
  | { type: "SELECT_PRODUCT"; id: string; advance?: boolean }
  | { type: "TOGGLE_COMPARE"; id: string }
  | { type: "SET_BUDGET"; budgetId: string }
  | { type: "SET_FILTERS"; patch: Partial<RadarFilters> }
  | { type: "APPLY_PRESET_DISTANCE"; km: number | null }
  | { type: "SET_SORT"; sort: SortKey }
  | { type: "SET_VIEW"; view: RadarView }
  | { type: "OPEN_STORE"; id: string | null }
  | { type: "CHOOSE_STORE"; id: string }
  | { type: "FAIL_STORE"; reason: FailReason }
  | { type: "PLANB_PRIORITY"; priority: RecoveryPriority }
  | { type: "PLANB_ACCEPT"; storeId: string }
  | { type: "PLANB_RETURN" }
  | { type: "PLANB_CLOSE" }
  | { type: "CLEAR_SUMMARY_FLAG" }
  | { type: "TRIP_CREATED"; id: string; failures?: FailureRecord[] }
  | { type: "RESET" }
  | { type: "HYDRATE"; state: SessionState; stage?: Stage; productId?: string }
  | { type: "SEED"; seedId: string }
  // The agent's turn (state/agentBridge.ts), applied at once when the stream is done.
  | { type: "CHAT_USER"; text: string }
  | { type: "AGENT_TOKEN"; text: string }
  | { type: "AGENT_MSG"; msg: Omit<Msg, "id"> }
  | { type: "SET_REQ"; req: Partial<JourneyReq> }
  | { type: "AGENT_DONE"; sessionId: string | null }
  | { type: "AGENT_OFFLINE" };

/* --------------------------- chat helpers --------------------------- */

const push = (chat: Msg[], ...msgs: Omit<Msg, "id">[]): Msg[] => [...chat, ...msgs.map((m) => ({ ...m, id: nextId() }))];

function detectCategory(text: string): Category | null {
  const t = normalize(text).replace(/‌/g, " ");
  // Things for a phone first: «شارژر گوشی», «قاب گوشی» are accessories that name the phone.
  if (/(هدفون|هندزفری|ایرپاد|ایربادز|هدست)/i.test(t)) return "headphone";
  if (/(پاوربانک|پاور بانک|شارژر همراه)/i.test(t)) return "powerbank";
  if (/(شارژر|کاور|قاب|گلس|محافظ صفحه|جانبی|اسپیکر)/i.test(t)) return "accessory";
  if (/(تبلت|آیپد|ایپد)/i.test(t)) return "tablet";
  if (/(تلویزیون|تی وی|اسمارت تی)/i.test(t)) return "tv";
  if (/(گوشی|موبایل|آیفون|سامسونگ|شیائومی|پیکسل)/i.test(t)) return "mobile";
  // after mobile: «گوشی برای عکاسی» is a phone; «دوربین» alone is often CCTV, so it needs a photo word
  if (/(دوربین (عکاسی|دیجیتال|بدون آینه|فیلمبرداری|کانن|نیکون|سونی)|بدون آینه|dslr)/i.test(t)) return "photo";
  if (/(لپ تاپ|لپتاپ|notebook|نوت بوک|مک بوک|کامپیوتر)/i.test(t)) return "laptop";
  return null;
}

/** «۱۵ تا ۲۵», «15-25 میلیون» → a band in toman; anything else → null. */
export function parseBudget(text: string): BudgetBand | null {
  const m = toAsciiDigits(text.trim()).match(/^(\d+(?:\.\d+)?)\s*(?:تا|-|–)\s*(\d+(?:\.\d+)?)\s*(?:میلیون)?\s*(?:تومان|تومن)?$/);
  if (!m) return null;
  const [lo, hi] = [Number(m[1]), Number(m[2])].sort((a, b) => a - b);
  return { id: "custom", label: `${toFaDigits(String(lo))} تا ${toFaDigits(String(hi))} میلیون`, min: lo * 1_000_000, max: hi * 1_000_000 };
}

export const CAT_LABEL: Record<Category, string> = {
  mobile: "موبایل", laptop: "لپ‌تاپ", tablet: "تبلت", tv: "تلویزیون", headphone: "هدفون",
  powerbank: "پاوربانک", photo: "دوربین عکاسی", accessory: "لوازم جانبی", other: "دسته‌ی دیگر",
};
const catLabel = (c: Category): string => CAT_LABEL[c];

function budgetAsk(cat: Category): Omit<Msg, "id"> {
  return {
    from: "assistant",
    text: `عالیه، ${catLabel(cat)} می‌خوای!\nحدود بودجه‌ات چقدره؟ (مثلاً «۱۵ تا ۲۵»؛ اگه مطمئن نیستی، ردش کن)`,
    chips: [
      ...BUDGETS[cat].map((b) => ({ id: `budget:${b.id}`, label: b.label })),
      ...(BUDGETS[cat].some((b) => b.label === "مهم نیست") ? [] : [{ id: "skip:budget", label: "فعلاً مهم نیست" }]),
    ],
  };
}

const PRIORITY_QUESTION: Partial<Record<Category, string>> = {
  mobile: "دوربین مهم‌تره یا باتری؟",
  laptop: "سبکی و حمل راحت مهم‌تره یا قدرت پردازش؟",
  accessory: "قیمت مهم‌تره یا برند و کیفیت؟",
  tablet: "صفحه‌ی بزرگ‌تر، باتری یا حافظه؟",
  tv: "اندازه‌ی صفحه مهم‌تره یا کیفیت تصویر؟",
  headphone: "نویز کنسلینگ، زمان پخش یا قیمت؟",
  powerbank: "ظرفیت، شارژ سریع یا سبکی؟",
  photo: "مگاپیکسل، عکاسی پیاپی یا سبکی؟",
};

function priorityAsk(cat: Category): Omit<Msg, "id"> {
  const q = PRIORITY_QUESTION[cat] ?? "چی برات مهم‌تره؟";
  return {
    from: "assistant",
    text: q,
    chips: [
      ...PRIORITIES[cat].map((p) => ({ id: `prio:${p.id}`, label: p.label, hint: p.hint })),
      { id: "skip:priority", label: "فرقی نداره" },
    ],
  };
}

function summaryMsg(req: JourneyReq): Omit<Msg, "id"> {
  const cat = req.category!;
  const budget = reqBudget(req);
  const prio = reqPriority(req);
  const lines = [
    `• دنبال: ${req.goalText ? req.goalText : catLabel(cat)}`,
    `• بودجه: ${budget ? budget.label : "مشخص نشده — همه‌ی بازه‌ها رو نشونت می‌دم"}`,
    `• اولویت: ${prio ? prio.label : "مشخص نشده — دید متعادل می‌دم"}`,
  ];
  return {
    from: "assistant",
    text: `جمع‌بندی نیازهات:\n${lines.join("\n")}\n\nسه استراتژی برات آماده می‌کنم: اقتصادی، متعادل و امکانات بیشتر. بریم ببینیم؟`,
    chips: [{ id: "go:products", label: "نمایش گزینه‌های مناسب" }],
  };
}

function handleChatText(s: SessionState, text: string): SessionState {
  let chat = push(s.chat, { from: "user", text });

  // A typed band answers the budget question (Review Focus 4).
  const band = s.req.category && s.req.category !== "other" && s.req.budgetId === null ? parseBudget(text) : null;
  if (band) {
    chat = push(chat, priorityAsk(s.req.category!));
    return { ...s, chat, req: { ...s.req, budgetId: band.id, customBudget: band } };
  }

  const cat = detectCategory(text) ?? (s.req.category && s.req.budgetId == null ? s.req.category : null);
  if (cat && cat !== "other") {
    chat = push(chat, budgetAsk(cat));
    return { ...s, chat, req: { ...s.req, category: cat, goalText: text } };
  }
  if (!cat && !s.req.category) {
    chat = push(chat, {
      from: "assistant",
      text: "باشه! دقیق‌ترش می‌کنی؟ از رو چیپ‌ها هم می‌تونی انتخاب کنی، یا اگه عجله داری مستقیم برو سراغ گزینه‌ها.",
      chips: CATEGORY_CHIPS,
    });
    return { ...s, chat, req: { ...s.req, goalText: text } };
  }
  if (s.req.category && s.req.budgetId === null) {
    chat = push(chat, budgetAsk(s.req.category));
    return { ...s, chat, req: { ...s.req, goalText: s.req.goalText || text } };
  }
  if (s.req.category && s.req.priorityId === null) {
    chat = push(chat, priorityAsk(s.req.category));
    return { ...s, chat };
  }
  chat = push(chat, summaryMsg(s.req));
  return { ...s, chat };
}

function handleChip(s: SessionState, chip: Chip): SessionState {
  const [kind, arg] = chip.id.split(":");
  let chat = push(s.chat, { from: "user", text: chip.label });
  let state = s;

  switch (kind) {
    case "cat": {
      const cat = arg as Category;
      if (cat === "other") {
        chat = push(chat, {
          from: "assistant",
          text: "صادقانه بگم: داده‌ی من فعلاً برای موبایل، لپ‌تاپ و لوازم جانبی گوشیه.\nمی‌تونی با همین ادامه بدی و ببینی چی پیدا می‌شه، یا یکی از این دسته‌ها رو انتخاب کنی.",
          chips: [...CATEGORY_CHIPS.slice(0, 3), { id: "go:products", label: "ادامه با همین دسته" }],
        });
        state = { ...state, req: { ...state.req, category: "other", goalText: chip.label } };
      } else {
        chat = push(chat, budgetAsk(cat));
        state = { ...state, req: { ...state.req, category: cat, goalText: state.req.goalText || chip.label } };
      }
      break;
    }
    case "budget": {
      const req = { ...state.req, budgetId: arg, customBudget: null };
      chat = push(chat, priorityAsk(req.category!));
      state = { ...state, req };
      break;
    }
    case "skip": {
      if (arg === "priority") {
        const req = { ...state.req, priorityId: null };
        chat = push(chat, summaryMsg(req));
        state = { ...state, req };
      } else {
        const req = { ...state.req, budgetId: null, customBudget: null };
        chat = push(chat, priorityAsk(req.category!));
        state = { ...state, req };
      }
      break;
    }
    case "prio": {
      const req = { ...state.req, priorityId: arg };
      chat = push(chat, summaryMsg(req));
      state = { ...state, req };
      break;
    }
    case "go": {
      if (arg === "products") state = { ...state, stage: "products", maxStage: later("products", state.maxStage) };
      break;
    }
  }
  return { ...state, chat };
}

/* ----------------------------- reducer ----------------------------- */

export function reducer(s: SessionState, a: Action): SessionState {
  switch (a.type) {
    case "CHAT_TEXT":
      return handleChatText(s, a.text.trim());
    case "CHAT_CHIP":
      return handleChip(s, a.chip);
    case "GO":
      return { ...s, stage: a.stage, maxStage: later(a.stage, s.maxStage) };
    case "SET_BUDGET":
      // The desk's «بدون محدودیت بودجه»: changes the band without a new chat turn.
      return { ...s, req: { ...s.req, budgetId: a.budgetId, customBudget: null } };
    case "SELECT_PRODUCT":
      return {
        ...s,
        selectedProductId: a.id,
        failures: a.advance ? [] : s.failures,
        chosenStoreId: a.advance ? null : s.chosenStoreId,
        selectedStoreId: null,
        planB: { open: false, reason: null, priority: null },
        previousPlan: null,
        tripId: null,
        stage: a.advance ? "radar" : s.stage,
        maxStage: a.advance ? later("radar", s.maxStage) : s.maxStage,
      };
    case "TOGGLE_COMPARE": {
      const has = s.compare.includes(a.id);
      const compare = has ? s.compare.filter((x) => x !== a.id) : s.compare.length >= 3 ? s.compare : [...s.compare, a.id];
      return { ...s, compare };
    }
    case "SET_FILTERS":
      return { ...s, filters: { ...s.filters, ...a.patch } };
    case "APPLY_PRESET_DISTANCE":
      return { ...s, filters: { ...s.filters, maxDistanceKm: a.km } };
    case "SET_SORT":
      return { ...s, sort: a.sort };
    case "SET_VIEW":
      return { ...s, radarView: a.view };
    case "OPEN_STORE":
      return { ...s, selectedStoreId: a.id };
    case "CHOOSE_STORE":
      return {
        ...s,
        chosenStoreId: a.id,
        selectedStoreId: null,
        stage: "summary",
        maxStage: later("summary", s.maxStage),
        summaryJustReady: true,
      };
    case "FAIL_STORE": {
      const id = s.selectedStoreId ?? s.chosenStoreId;
      if (!id) return s;
      return {
        ...s,
        selectedStoreId: null,
        failures: [...s.failures.filter((f) => f.storeId !== id), { storeId: id, reason: a.reason, at: Date.now() }],
        previousPlan: { storeId: id },
        planB: { open: true, reason: a.reason, priority: null },
      };
    }
    case "PLANB_PRIORITY":
      return { ...s, planB: { ...s.planB, priority: a.priority } };
    case "PLANB_ACCEPT":
      return {
        ...s,
        chosenStoreId: a.storeId,
        selectedStoreId: a.storeId,
        planB: { open: false, reason: null, priority: s.planB.priority },
      };
    case "PLANB_RETURN":
      return {
        ...s,
        chosenStoreId: s.previousPlan?.storeId ?? s.chosenStoreId,
        selectedStoreId: s.previousPlan?.storeId ?? null,
        planB: { open: false, reason: null, priority: null },
      };
    case "PLANB_CLOSE":
      return { ...s, planB: { open: false, reason: null, priority: null } };
    case "CLEAR_SUMMARY_FLAG":
      return { ...s, summaryJustReady: false };
    case "TRIP_CREATED":
      // A shared trip link brings its own failures; the session's own list wins once it has one.
      return { ...s, tripId: a.id, failures: s.tripId === a.id ? s.failures : (a.failures ?? s.failures) };
    case "RESET":
      return { ...initialState(), epoch: (s.epoch ?? 0) + 1 };
    case "HYDRATE": {
      // The page's stage wins over the stored one (browser Back); the furthest stage is kept.
      const stage = a.stage ?? a.state.stage;
      const s1 = { ...a.state, stage, maxStage: later(stage, a.state.maxStage) };
      // The URL's product wins too; a different product starts with SELECT_PRODUCT's clean slate.
      if (!a.productId || a.productId === s1.selectedProductId) return s1;
      return { ...reducer(s1, { type: "SELECT_PRODUCT", id: a.productId, advance: true }), stage, maxStage: s1.maxStage };
    }
    case "CHAT_USER":
      return { ...s, chat: push(s.chat, { from: "user", text: a.text }) };
    case "AGENT_TOKEN": {
      const last = s.chat[s.chat.length - 1];
      if (last?.from !== "assistant") return { ...s, chat: push(s.chat, { from: "assistant", text: a.text }) };
      return { ...s, chat: [...s.chat.slice(0, -1), { ...last, text: last.text + a.text }] };
    }
    case "AGENT_MSG": {
      // An ask whose question the say already holds hands its chips to that message.
      const last = s.chat[s.chat.length - 1];
      if (a.msg.chips && a.msg.text && last?.from === "assistant" && !last.chips && last.text.includes(a.msg.text))
        return { ...s, chat: [...s.chat.slice(0, -1), { ...last, chips: a.msg.chips }] };
      return { ...s, chat: push(s.chat, a.msg) };
    }
    case "SET_REQ":
      return { ...s, req: { ...s.req, ...a.req } };
    case "AGENT_DONE":
      return { ...s, agentSessionId: a.sessionId ?? s.agentSessionId, agentOffline: false };
    case "AGENT_OFFLINE":
      return { ...s, agentOffline: true };
    case "SEED": {
      const steps = SEEDS[a.seedId];
      return steps ? steps.reduce(reducer, initialState()) : s;
    }
    default:
      return s;
  }
}

/* ----------------------------- routes ----------------------------- */

export function stagePath(s: SessionState): string | null {
  switch (s.stage) {
    case "consult":
      return "/start";
    case "products":
      return "/desk";
    case "radar":
      return s.selectedProductId ? `/radar/${s.selectedProductId}` : null;
    case "summary":
      return s.tripId ? `/trip/${s.tripId}` : null;
  }
}

/* ----------------------------- storage ----------------------------- */

const STORAGE_KEY = "torobgard-session-v2";

export function loadState(storage: Pick<Storage, "getItem">): SessionState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionState;
      mid = Math.max(...parsed.chat.map((m) => m.id), 0) + 1; // throws on a wrong shape → fresh start
      // An older stored shape keeps today's defaults for fields it did not have.
      return { ...initialState(), ...parsed, summaryJustReady: false };
    }
  } catch {
    /* corrupted session → start fresh */
  }
  return initialState();
}

export function resetStorage() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/* ----------------------------- provider ----------------------------- */

const Ctx = createContext<{ state: SessionState; dispatch: React.Dispatch<Action> } | null>(null);

export function SessionProvider({ stage, productId, children }: { stage: Stage; productId?: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Server and first client render share initialState(); storage is read after mount (no hydration mismatch).
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // After hydration the URL and the stage agree; a stage change that the URL does not show is a navigation.
  useEffect(() => {
    if (!ready) return;
    const path = stagePath(state);
    // The trip pages own their URL (a shared link must not jump to this session's trip); TopBar's step ۴ navigates itself.
    if (state.stage !== "summary" && path && path !== pathname) router.push(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigate only when the stage or its id changes
  }, [ready, state.stage, state.selectedProductId]);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      let seed: string | null = null;
      try {
        seed = new URLSearchParams(window.location.search).get("seed");
      } catch {
        /* no window */
      }
      // ponytail: ?seed= replays on every load of that URL; fine for a demo link.
      if (seed && SEEDS[seed]) dispatch({ type: "SEED", seedId: seed });
      else {
        let stored = initialState();
        try {
          stored = loadState(sessionStorage);
        } catch {
          /* storage blocked */
        }
        dispatch({ type: "HYDRATE", state: stored, stage, productId });
      }
      setReady(true);
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full/blocked — session continues in memory */
    }
  }, [state, stage, productId]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession outside provider");
  return ctx;
}

export const reqBudget = (req: JourneyReq): BudgetBand | null =>
  req.budgetId === "custom"
    ? req.customBudget
    : req.category
      ? (BUDGETS[req.category].find((b) => b.id === req.budgetId) ?? null)
      : null;

export const reqPriority = (req: JourneyReq) =>
  req.category ? (PRIORITIES[req.category].find((p) => p.id === req.priorityId) ?? null) : null;
