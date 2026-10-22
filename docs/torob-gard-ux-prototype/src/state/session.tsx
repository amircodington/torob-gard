/* ------------------------------------------------------------------
 * Shopping-session state (client-side, no backend).
 * Keeps: needs, chat, selected product, filters/sort, selected &
 * chosen store, failures, Plan-B priority + previous-plan snapshot.
 * Mirrored to sessionStorage so a refresh never loses the journey.
 * ------------------------------------------------------------------ */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { BUDGETS, PRIORITIES } from "../data/demo";
import type {
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

interface Chip {
  id: string;
  label: string;
  hint?: string;
}

export interface Msg extends ChatMsg {
  chips?: Chip[];
}

export interface SessionState {
  stage: Stage;
  maxStage: Stage;
  chat: Msg[];
  req: Requirements;
  selectedProductId: string | null;
  compare: string[];
  filters: RadarFilters;
  sort: SortKey;
  radarView: RadarView;
  selectedStoreId: string | null; // open detail sheet
  chosenStoreId: string | null;   // the plan
  failures: FailureRecord[];
  planB: { open: boolean; reason: FailReason | null; priority: RecoveryPriority | null };
  previousPlan: { storeId: string } | null;
  summaryJustReady: boolean;
}

const STAGE_ORDER: Stage[] = ["consult", "products", "radar", "summary"];
const later = (a: Stage, b: Stage): Stage =>
  STAGE_ORDER.indexOf(a) >= STAGE_ORDER.indexOf(b) ? a : b;

let mid = 1;
const nextId = () => mid++;

const GREETING: Msg = {
  id: 0,
  from: "assistant",
  text: "سلام! من ترب‌گردم — همراهت برای خرید حضوری، از «چی بخرم» تا «از کجا بخرم».\nچی می‌خوای بخری؟",
  chips: [
    { id: "cat:mobile", label: "موبایل" },
    { id: "cat:laptop", label: "لپ‌تاپ" },
    { id: "cat:accessory", label: "لوازم جانبی" },
    { id: "cat:other", label: "چیز دیگه" },
  ],
};

export const initialState = (): SessionState => ({
  stage: "consult",
  maxStage: "consult",
  chat: [GREETING],
  req: { category: null, goalText: "", budgetId: null, priorityId: null },
  selectedProductId: null,
  compare: [],
  filters: { maxPrice: null, maxDistanceKm: null, openNow: false, installment: false },
  sort: "price",
  radarView: "map",
  selectedStoreId: null,
  chosenStoreId: null,
  failures: [],
  planB: { open: false, reason: null, priority: null },
  previousPlan: null,
  summaryJustReady: false,
});

/* ----------------------------- actions ----------------------------- */

type Action =
  | { type: "CHAT_TEXT"; text: string }
  | { type: "CHAT_CHIP"; chip: Chip }
  | { type: "GO"; stage: Stage }
  | { type: "SELECT_PRODUCT"; id: string; advance?: boolean }
  | { type: "TOGGLE_COMPARE"; id: string }
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
  | { type: "RESET" }
  | { type: "HYDRATE"; state: SessionState }
  | { type: "SEED_DEMO" };

/* --------------------------- chat helpers --------------------------- */

const push = (chat: Msg[], ...msgs: Omit<Msg, "id">[]): Msg[] => [
  ...chat,
  ...msgs.map((m) => ({ ...m, id: nextId() })),
];

function detectCategory(text: string): Category | null {
  const t = text.replace(/‌/g, " ");
  if (/(گوشی|موبایل|آیفون|سامسونگ|شیائومی|پیکسل)/i.test(t)) return "mobile";
  if (/(لپ تاپ|لپتاپ|notebook|نوت بوک|مک بوک|کامپیوتر)/i.test(t)) return "laptop";
  if (/(هندزفری|ایرپاد|شارژر|کاور|قاب|پاوربانک|جانبی|اسپیکر)/i.test(t)) return "accessory";
  return null;
}

const catLabel = (c: Category): string =>
  c === "mobile" ? "موبایل" : c === "laptop" ? "لپ‌تاپ" : c === "accessory" ? "لوازم جانبی" : "دسته‌ی دیگر";

function budgetAsk(cat: Category): Omit<Msg, "id"> {
  return {
    from: "assistant",
    text: `عالیه، ${catLabel(cat)} می‌خوای!\nحدود بودجه‌ات چقدره؟ (اگه مطمئن نیستی، رد ش کن)`,
    chips: [
      ...BUDGETS[cat].map((b) => ({ id: `budget:${b.id}`, label: b.label })),
      { id: "skip:budget", label: "فعلا مهم نیست" },
    ],
  };
}

function priorityAsk(cat: Category): Omit<Msg, "id"> {
  const q =
    cat === "mobile"
      ? "دوربین مهم‌تره یا باتری؟"
      : cat === "laptop"
        ? "سبکی و حمل راحت مهم‌تره یا قدرت پردازش؟"
        : cat === "accessory"
          ? "قیمت مهم‌تره یا برند و کیفیت؟"
          : "چی برات مهم‌تره؟";
  return {
    from: "assistant",
    text: q,
    chips: [
      ...PRIORITIES[cat].map((p) => ({ id: `prio:${p.id}`, label: p.label, hint: p.hint })),
      { id: "skip:priority", label: "فرقی نداره" },
    ],
  };
}

function summaryMsg(req: Requirements): Omit<Msg, "id"> {
  const cat = req.category!;
  const budget = BUDGETS[cat].find((b) => b.id === req.budgetId);
  const prio = PRIORITIES[cat].find((p) => p.id === req.priorityId);
  const lines: string[] = [];
  lines.push(`• دنبال: ${req.goalText ? req.goalText : catLabel(cat)}`);
  lines.push(`• بودجه: ${budget ? budget.label : "مشخص نشده — همه‌ی بازه‌ها رو نشونت می‌دم"}`);
  lines.push(`• اولویت: ${prio ? prio.label : "مشخص نشده — دید متعادل می‌دم"}`);
  return {
    from: "assistant",
    text: `جمع‌بندی نیازهات:\n${lines.join("\n")}\n\nسه استراتژی برات آماده کردم: اقتصادی، متعادل و امکانات بیشتر. بریم ببینیم؟`,
    chips: [{ id: "go:products", label: "نمایش گزینه‌های مناسب" }],
  };
}

function handleChatText(s: SessionState, text: string): SessionState {
  let chat = push(s.chat, { from: "user", text });
  const cat = detectCategory(text) ?? (s.req.category && s.req.budgetId == null ? s.req.category : null);

  if (cat && cat !== "other") {
    chat = push(chat, budgetAsk(cat));
    return { ...s, chat, req: { ...s.req, category: cat, goalText: text } };
  }
  if (!cat && !s.req.category) {
    chat = push(chat, {
      from: "assistant",
      text: "باشه! دقیقترش می‌کنی؟ از رو چیپ‌ها هم می‌تونی انتخاب کنی، یا اگه عجله داری مستقیم برو سراغ گزینه‌ها.\n(نسخه‌ی نمایشی: داده‌ی کامل روی «موبایل» آماده‌ست)",
      chips: [
        { id: "cat:mobile", label: "موبایل" },
        { id: "cat:laptop", label: "لپ‌تاپ" },
        { id: "cat:accessory", label: "لوازم جانبی" },
        { id: "cat:other", label: "چیز دیگه" },
      ],
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
  let chat = s.chat;
  let state = s;

  switch (kind) {
    case "cat": {
      const cat = arg as Category;
      chat = push(chat, { from: "user", text: chip.label });
      if (cat === "other") {
        chat = push(chat, {
          from: "assistant",
          text: "صادقانه بگم: داده‌ی این نسخه‌ی نمایشی برای «موبایل» کامله و برای لپ‌تاپ و لوازم جانبی محدودتره.\nمی‌تونی با همین دسته ادامه بدی و حالت خالیِ طراحی‌شده رو ببینی، یا یکی از دسته‌های آماده رو انتخاب کنی.",
          chips: [
            { id: "cat:mobile", label: "موبایل (کامل)" },
            { id: "cat:laptop", label: "لپ‌تاپ" },
            { id: "cat:accessory", label: "لوازم جانبی" },
            { id: "go:products", label: "ادامه با همین دسته →" },
          ],
        });
        state = { ...state, req: { ...state.req, category: "other", goalText: chip.label } };
      } else {
        chat = push(chat, budgetAsk(cat));
        state = { ...state, req: { ...state.req, category: cat, goalText: state.req.goalText || chip.label } };
      }
      break;
    }
    case "budget": {
      chat = push(chat, { from: "user", text: chip.label });
      const req = { ...state.req, budgetId: arg };
      chat = push(chat, priorityAsk(req.category!));
      state = { ...state, req };
      break;
    }
    case "skip": {
      chat = push(chat, { from: "user", text: chip.label });
      if (arg === "priority") {
        const req = { ...state.req, priorityId: null };
        chat = push(chat, summaryMsg(req));
        state = { ...state, req };
      } else {
        const req = { ...state.req, budgetId: null };
        chat = push(chat, priorityAsk(req.category!));
        state = { ...state, req };
      }
      break;
    }
    case "prio": {
      chat = push(chat, { from: "user", text: chip.label });
      const req = { ...state.req, priorityId: arg };
      chat = push(chat, summaryMsg(req));
      state = { ...state, req };
      break;
    }
    case "go": {
      chat = push(chat, { from: "user", text: chip.label });
      if (arg === "products") {
        state = {
          ...state,
          stage: "products",
          maxStage: later("products", state.maxStage),
        };
      }
      break;
    }
  }
  return { ...state, chat };
}

/* ----------------------------- reducer ----------------------------- */

function reducer(s: SessionState, a: Action): SessionState {
  switch (a.type) {
    case "CHAT_TEXT":
      return handleChatText(s, a.text.trim());
    case "CHAT_CHIP":
      return handleChip(s, a.chip);
    case "GO":
      return { ...s, stage: a.stage, maxStage: later(a.stage, s.maxStage) };
    case "SELECT_PRODUCT":
      return {
        ...s,
        selectedProductId: a.id,
        failures: a.advance ? [] : s.failures,
        chosenStoreId: a.advance ? null : s.chosenStoreId,
        selectedStoreId: null,
        planB: { open: false, reason: null, priority: null },
        previousPlan: null,
        stage: a.advance ? "radar" : s.stage,
        maxStage: a.advance ? later("radar", s.maxStage) : s.maxStage,
      };
    case "TOGGLE_COMPARE": {
      const has = s.compare.includes(a.id);
      const compare = has
        ? s.compare.filter((x) => x !== a.id)
        : s.compare.length >= 3
          ? s.compare
          : [...s.compare, a.id];
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
    case "RESET":
      return initialState();
    case "HYDRATE":
      return a.state;
    case "SEED_DEMO": {
      let chat = push(s.chat, { from: "user", text: "یه گوشی برای عکاسی و دانشگاه می‌خوام" });
      chat = push(chat, budgetAsk("mobile"));
      chat = push(chat, { from: "user", text: "۱۵ تا ۲۵ میلیون" });
      chat = push(chat, priorityAsk("mobile"));
      const req: Requirements = {
        category: "mobile",
        goalText: "یه گوشی برای عکاسی و دانشگاه می‌خوام",
        budgetId: "m2",
        priorityId: "camera",
      };
      chat = push(chat, { from: "user", text: "دوربین مهم‌تره" });
      chat = push(chat, summaryMsg(req));
      return { ...s, chat, req };
    }
    default:
      return s;
  }
}

/* ----------------------------- provider ----------------------------- */

const Ctx = createContext<{
  state: SessionState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

const STORAGE_KEY = "torobgard-session-v1";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SessionState;
        mid = Math.max(...parsed.chat.map((m) => m.id), 0) + 1;
        return { ...parsed, summaryJustReady: false };
      }
    } catch {
      /* corrupted session → start fresh */
    }
    return initialState();
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full/blocked — session continues in memory */
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession outside provider");
  return ctx;
}

export function resetStorage() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export const reqBudget = (req: Requirements) =>
  req.category ? BUDGETS[req.category].find((b) => b.id === req.budgetId) ?? null : null;

export const reqPriority = (req: Requirements) =>
  req.category ? PRIORITIES[req.category].find((p) => p.id === req.priorityId) ?? null : null;
