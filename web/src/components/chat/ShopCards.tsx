"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { OfferRow } from "../../lib/types";
import { useSession } from "../../state/session";
import { ShopRow } from "../radar/ShopRow";

/** The agent's shop_cards block: up to three radar rows inline; a tap opens that shop on the radar. */
export function ShopCards({ offerIds, why }: { offerIds: string[]; why: Record<string, string> }) {
  const { dispatch } = useSession();
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
      {rows.map((row) => (
        <li key={row.offer.offerId}>
          <ShopRow
            row={row}
            now={now}
            onOpen={() => {
              dispatch({ type: "SELECT_PRODUCT", id: row.offer.productId, advance: true });
              dispatch({ type: "OPEN_STORE", id: row.store.id });
            }}
          />
          {why[row.store.id] && <p className="mt-1 px-2 text-[13px] leading-5 text-ink-muted">{why[row.store.id]}</p>}
        </li>
      ))}
    </ul>
  );
}
