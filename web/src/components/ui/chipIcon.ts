import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgePercent,
  BatteryFull,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Cpu,
  Feather,
  Headphones,
  Laptop,
  LogOut,
  Package,
  Scale,
  SendHorizontal,
  Smartphone,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const EXACT: Record<string, LucideIcon> = {
  "cat:mobile": Smartphone,
  "cat:laptop": Laptop,
  "cat:accessory": Headphones,
  "cat:other": Package,
  "prio:camera": Camera,
  "prio:battery": BatteryFull,
  "prio:both": Scale,
  "prio:both2": Scale,
  "prio:weight": Feather,
  "prio:power": Cpu,
  "prio:price": BadgePercent,
  "prio:brand": Award,
};
const PREFIX: Record<string, LucideIcon> = { budget: Wallet, skip: CircleSlash, go: ArrowRight };

/** The icon for a consult chip id, or null when the chip has none. */
export function chipIcon(id: string): LucideIcon | null {
  return EXACT[id] ?? PREFIX[id.split(":")[0]] ?? null;
}

const DIRECTIONAL = new Set<unknown>([ArrowRight, ArrowLeft, ChevronRight, ChevronLeft, SendHorizontal, Undo2, LogOut]);
/** Icons that imply direction mirror under RTL (plan's RTL icon rule); Btn and Chip add `flip-rtl` for them. */
export const isDirectional = (icon: unknown) => DIRECTIONAL.has(icon);
