import { faNum } from "./fa";

/** Brief step 4, simulated: the dataset's numbers are not real shops, so nobody is actually contacted.
 *  The answer is a hash of shop + product (the same shop always answers the same way) and the UI says it is a simulation. */
export type SellerReply =
  | { kind: "confirmed"; at: string; priceToman: number; delta: number }
  | { kind: "no_answer"; at: string }
  | { kind: "no_item"; at: string };

const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function simulateSeller(storeId: string, productId: string, priceToman: number, now: Date): SellerReply {
  let h = 0;
  for (const c of storeId + productId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const at = faNum(clock.format(new Date(now.getTime() + 2 * 60_000)));
  const roll = h % 10;
  if (roll >= 9) return { kind: "no_item", at };
  if (roll >= 7) return { kind: "no_answer", at };
  const delta = roll >= 5 ? Math.max(50_000, Math.round((priceToman * 0.02) / 10_000) * 10_000) : 0;
  return { kind: "confirmed", at, priceToman: priceToman + delta, delta };
}
