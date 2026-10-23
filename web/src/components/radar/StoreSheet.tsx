"use client";

import { usePathname, useRouter } from "next/navigation";
import { DoorClosed, Navigation, PackageX, PhoneOff, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { api, type ReportInput } from "../../lib/api";
import { faPriceFull } from "../../lib/fa";
import { todayHoursLabel } from "../../lib/hours";
import { toAsciiDigits } from "../../lib/persian";
import type { FailReason, OfferRow } from "../../lib/types";
import { useSession } from "../../state/session";
import { Btn } from "../ui/Btn";
import { FreshBadge } from "../ui/FreshBadge";
import { Sheet } from "../ui/Sheet";
import { StockBadge } from "../ui/StockBadge";
import type { RadarAnchor } from "./AnchorPicker";
import { PriceCheck } from "./PriceCheck";
import { SellerFollowUp } from "./SellerFollowUp";
import { distanceLabel, placeLine } from "./ShopRow";

const FAILS: { label: string; kind: ReportInput["kind"]; reason: FailReason; icon: LucideIcon }[] = [
  { label: "جواب ندادن", kind: "no_answer", reason: "no-answer", icon: PhoneOff },
  { label: "موجود نبود", kind: "no_item", reason: "stock", icon: PackageX },
  { label: "بسته بود", kind: "closed", reason: "closed", icon: DoorClosed },
];

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-line py-3 first:border-t-0 first:pt-0">
      <p className="text-[12px] font-semibold text-ink-muted">{label}</p>
      <div className="mt-0.5 text-[15px] leading-6">{children}</div>
    </div>
  );
}

export function StoreSheet({ row, anchor, now }: { row: OfferRow | null; anchor: RadarAnchor; now: Date }) {
  const { state, dispatch } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (!row) return null;
  const { offer, store } = row;

  const go = async () => {
    setBusy(true);
    setError(false);
    try {
      // The phone's own position is never sent; a landmark anchor is public.
      const trip = await api.createTrip({
        productId: offer.productId,
        chosenShopId: store.id,
        req: { ...state.req },
        failures: state.failures ?? [],
        anchor: anchor.landmark ? { lat: anchor.lat, lng: anchor.lng } : {},
      });
      dispatch({ type: "CHOOSE_STORE", id: store.id });
      dispatch({ type: "TRIP_CREATED", id: trip.id });
      router.push(`/trip/${trip.id}`);
    } catch {
      setBusy(false);
      setError(true);
    }
  };

  const fail = async (f: (typeof FAILS)[number]) => {
    setBusy(true);
    // ponytail: the report is a signal for others; Plan B opens even when it does not reach the server.
    await api.report({ shopId: store.id, productId: offer.productId, kind: f.kind }).catch(() => {});
    setBusy(false);
    planB(f.reason);
  };
  // a simulated seller reply goes straight here: it is not a real signal, so no report is sent
  const planB = (reason: FailReason) => {
    dispatch({ type: "FAIL_STORE", reason });
    router.push(`${pathname}?planb=${reason}`);
  };

  const installment = store.installment === true ? "اقساط دارد" : store.installment === false ? "اقساط ندارد" : "اطلاعات اقساط ثبت نشده";

  return (
    <Sheet open onClose={() => dispatch({ type: "OPEN_STORE", id: null })} labelledby="store-title">
      <div>
        <div className="pe-12">
          <h2 id="store-title" className="break-words text-[20px] font-extrabold leading-8">{store.name}</h2>
          <p className="mt-0.5 break-words text-[13px] leading-5 text-on-dark/70">{placeLine(store)}</p>
          <p className="text-[13px] leading-5 text-on-dark/70">{distanceLabel(store.distanceM)} از {anchor.label}</p>
        </div>

        <div className="mt-4 rounded-lg bg-surface p-5 text-ink">
          <Fact label="قیمت ثبت‌شده‌ی فروشگاه در ترب">
            <p className="tabular text-[22px] font-bold leading-8">{faPriceFull(offer.priceToman)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <FreshBadge updatedMinAgo={offer.updatedMinAgo} />
              <StockBadge stock={offer.stock} />
            </div>
          </Fact>
          <Fact label="آدرس">
            <p className="break-words">{store.address || "آدرس ثبت نشده"}</p>
          </Fact>
          <Fact label="ساعت کاری">{todayHoursLabel(store.weeklyHours, now)}</Fact>
          <Fact label="اقساط">{installment}</Fact>
          <Fact label="تماس">
            {store.contact ? (
              <a href={`tel:${toAsciiDigits(store.contact)}`} className="tabular inline-flex min-h-11 items-center font-bold text-ink underline underline-offset-4">
                {store.contact}
              </a>
            ) : (
              "شماره ثبت نشده"
            )}
          </Fact>
        </div>
        <PriceCheck key={store.id} productId={offer.productId} />
        <SellerFollowUp key={`follow-${store.id}`} row={row} now={now} onPlanB={planB} />

        <p className="mt-3 text-[12px] leading-5 text-on-dark/60">قبل از رفتن زنگ بزن؛ قیمت و موجودی رو خود فروشگاه تأیید می‌کنه.</p>
        <Btn className="mt-3 w-full" icon={Navigation} disabled={busy} onClick={go}>
          برو همین‌جا
        </Btn>
        {error && (
          <p role="alert" className="mt-2 text-[13px] text-on-dark">
            برنامه‌ی سفر ساخته نشد؛ دوباره امتحان کن.
          </p>
        )}
        <p className="mt-5 text-[13px] font-bold text-on-dark/70">زنگ زدی یا رفتی و نشد؟</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {FAILS.map((f) => (
            <button
              key={f.kind}
              type="button"
              disabled={busy}
              onClick={() => fail(f)}
              className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-md bg-panel-2 px-2 py-1.5 text-[13px] font-bold text-on-dark press hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
            >
              <f.icon aria-hidden className="hover-hop size-4" />
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
