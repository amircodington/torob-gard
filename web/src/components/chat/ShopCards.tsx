"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { api } from "../../lib/api";
import type { OfferRow } from "../../lib/types";
import { ShopRow } from "../radar/ShopRow";

/** The agent's shop_cards block: up to three radar rows inline; a tap does what the caller says (the journey
 *  chat opens that shop on the radar; the product page, outside the journey's session, goes to the radar). */
export function ShopCards({ offerIds, why, onOpen }: { offerIds: string[]; why: Record<string, string>; onOpen: (row: OfferRow) => void }) {
  const [rows, setRows] = useState<OfferRow[]>([]);
  const key = offerIds.join(",");

  useEffect(() => {
    let live = true;
    // ponytail: a failed fetch shows no cards; the agent's say text still names the shops.
    api.offersById(key.split(",")).then((r) => live && setRows(r), () => {});
    return () => {
      live = false;
    };
  }, [key]);

  if (!rows.length) return null;
  const now = new Date();
  return (
    <ul aria-label="فروشگاه‌های پیشنهادی" className="flex flex-col gap-2 pe-11">
      {/* the agent's block arrives: its rows rise in, 40 ms apart */}
      {rows.map((row, i) => (
        <li key={row.offer.offerId} style={{ "--i": i } as CSSProperties} className="animate-rise stagger">
          <ShopRow
            row={row}
            now={now}
            onOpen={() => onOpen(row)}
          />
          {why[row.store.id] && <p className="mt-1 px-2 text-[13px] leading-5 text-ink-muted">{why[row.store.id]}</p>}
        </li>
      ))}
    </ul>
  );
}
