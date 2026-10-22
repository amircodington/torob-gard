"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { JourneyShell } from "../../../components/JourneyShell";
import { DistrictMap } from "../../../components/map/DistrictMap";
import { AnchorPicker, landmarkAnchor, type RadarAnchor } from "../../../components/radar/AnchorPicker";
import { FilterPanel, NO_FILTERS } from "../../../components/radar/FilterPanel";
import { ShopRow } from "../../../components/radar/ShopRow";
import { StoreSheet } from "../../../components/radar/StoreSheet";
import { Toolbar } from "../../../components/radar/Toolbar";
import { Btn } from "../../../components/ui/Btn";
import { EmptyState } from "../../../components/ui/EmptyState";
import { api } from "../../../lib/api";
import { faNum } from "../../../lib/fa";
import { DEFAULT_LANDMARK } from "../../../lib/geo";
import { applyFilters, sortRows } from "../../../lib/ranking";
import type { OfferRow, Product } from "../../../lib/types";
import { useSession } from "../../../state/session";

type Loaded = { key: string; product?: Product; rows?: OfferRow[]; now?: Date; error?: true };

function Radar({ id }: { id: string }) {
  const { state, dispatch } = useSession();
  // ponytail: SessionState has no anchor field, so the anchor lives in this page only (a reload starts at Saadi).
  const [anchor, setAnchor] = useState<RadarAnchor>(() => landmarkAnchor(DEFAULT_LANDMARK));
  const [attempt, setAttempt] = useState(0);
  const [res, setRes] = useState<Loaded | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const closeFilters = useCallback(() => setFiltersOpen(false), []); // stable: ui/Sheet refocuses on a new onClose
  const key = JSON.stringify([id, anchor.lat, anchor.lng, attempt]);
  useEffect(() => {
    let live = true;
    Promise.all([api.product(id), api.offerRows(id, anchor)])
      .then(([product, rows]) => live && setRes({ key, product, rows, now: new Date() }))
      .catch(() => live && setRes({ key, error: true }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers every input
  }, [key]);

  const cur = res?.key === key ? res : null;
  const all = cur?.rows;
  const rows = useMemo(() => (all ? sortRows(applyFilters(all, state.filters, cur?.now), state.sort) : []), [all, state.filters, state.sort, cur?.now]);
  const changeModel = (
    <Btn variant="ghost" onClick={() => dispatch({ type: "GO", stage: "products" })}>
      تغییر مدل
    </Btn>
  );

  if (cur?.error)
    return (
      <EmptyState
        pose="stuck"
        title="رادار الان باز نشد"
        body="به سرور ترب‌گرد نرسیدم. مدلت حفظ شده؛ دوباره امتحان کن."
        actions={
          <>
            <Btn onClick={() => setAttempt((a) => a + 1)}>تلاش دوباره</Btn>
            {changeModel}
          </>
        }
      />
    );

  // Keep the last good product title while a new anchor refetches.
  const product = cur?.product ?? res?.product;
  const open = rows.find((r) => r.store.id === state.selectedStoreId) ?? null;

  return (
    <>
      <div className="mt-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] leading-8">
            <span className="font-light">رادار </span>
            <span className="font-extrabold">فروشگاه</span>
          </h1>
          <p className="line-clamp-2 break-words text-[15px] leading-6 text-ink-muted">{product?.title ?? "…"}</p>
        </div>
        {changeModel}
      </div>

      <div className="mt-3">
        <AnchorPicker anchor={anchor} onChange={setAnchor} />
      </div>

      {all?.length === 0 ? (
        <EmptyState pose="stuck" title="برای این مدل فروشگاهی ثبت نشده" body="هیچ فروشگاهی در ترب این مدل رو پیشنهاد نداده." actions={changeModel} />
      ) : (
        <>
          <div className="mt-4">
            <Toolbar onFilters={() => setFiltersOpen(true)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <div className={state.radarView === "list" ? "hidden md:block" : ""}>
              {all && (
                <DistrictMap
                  rows={rows}
                  anchor={anchor}
                  selectedId={state.selectedStoreId ?? undefined}
                  onSelect={(sid) => dispatch({ type: "OPEN_STORE", id: sid })}
                  radiusKm={state.filters.maxDistanceKm ?? undefined}
                />
              )}
            </div>
            <div className={state.radarView === "map" ? "hidden md:block" : ""}>
              {!all ? (
                <div aria-busy="true" aria-label="در حال پیدا کردن فروشگاه‌ها" className="grid gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-lg bg-surface-tint motion-safe:animate-pulse" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <EmptyState
                  pose="idle"
                  title="هیچ فروشگاهی با این فیلترها جور در نمی‌آد"
                  body="مدلت دست‌نخورده؛ فقط محدوده رو بازتر کن."
                  actions={<Btn onClick={() => dispatch({ type: "SET_FILTERS", patch: NO_FILTERS })}>پاک کردن فیلترها</Btn>}
                />
              ) : (
                <>
                  <p className="mb-2 flex justify-between px-1 text-[12px] font-semibold text-ink-muted">
                    <span>{faNum(rows.length)} فروشگاه</span>
                    <span>قیمت‌ها به هزار تومان</span>
                  </p>
                  <ul aria-label="فروشگاه‌ها" className="grid gap-3">
                    {rows.map((r) => (
                      <li key={r.offer.offerId}>
                        <ShopRow row={r} now={cur!.now!} onOpen={() => dispatch({ type: "OPEN_STORE", id: r.store.id })} />
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[12px] leading-5 text-ink-muted">
                    قیمت‌ها «آخرین قیمتِ ثبت‌شده‌ی فروشگاه»اند و به‌روز بودنشان تضمین نمی‌شود؛ قبل از رفتن زنگ بزن.
                  </p>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <FilterPanel open={filtersOpen} onClose={closeFilters} prices={all?.map((r) => r.offer.priceToman) ?? []} shown={rows.length} />
      <StoreSheet row={open} anchor={anchor} now={cur?.now ?? new Date()} />
    </>
  );
}

export default function RadarPage() {
  const { productId } = useParams<{ productId: string }>();
  return (
    <JourneyShell stage="radar" productId={productId}>
      <main className="mx-auto max-w-md px-4 pb-32 pt-2 md:max-w-5xl">
        <Radar id={productId} />
      </main>
    </JourneyShell>
  );
}
