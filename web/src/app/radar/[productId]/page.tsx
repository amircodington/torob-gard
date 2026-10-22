"use client";

import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { JourneyShell } from "../../../components/JourneyShell";
import { DistrictMap } from "../../../components/map/DistrictMap";
import { PlanB } from "../../../components/planb/PlanB";
import { AnchorPicker, landmarkAnchor, type RadarAnchor } from "../../../components/radar/AnchorPicker";
import { FilterPanel, NO_FILTERS } from "../../../components/radar/FilterPanel";
import { ShopRow } from "../../../components/radar/ShopRow";
import { StoreSheet } from "../../../components/radar/StoreSheet";
import { Toolbar, ViewSwitch } from "../../../components/radar/Toolbar";
import { Btn } from "../../../components/ui/Btn";
import { EmptyState } from "../../../components/ui/EmptyState";
import { api, ApiError } from "../../../lib/api";
import { faNum } from "../../../lib/fa";
import { DEFAULT_LANDMARK } from "../../../lib/geo";
import { applyFilters, sortRows } from "../../../lib/ranking";
import type { OfferRow, Product } from "../../../lib/types";
import { useSession } from "../../../state/session";

const LG = "(min-width: 1024px)";
const onLg = (cb: () => void) => {
  const m = window.matchMedia(LG);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

type Loaded = { key: string; product?: Product; rows?: OfferRow[]; now?: Date; error?: true; missing?: boolean };

function Radar({ id }: { id: string }) {
  const { state, dispatch } = useSession();
  // ponytail: SessionState has no anchor field, so the anchor lives in this page only (a reload starts at Saadi).
  const [anchor, setAnchor] = useState<RadarAnchor>(() => landmarkAnchor(DEFAULT_LANDMARK));
  const [attempt, setAttempt] = useState(0);
  const [res, setRes] = useState<Loaded | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const lg = useSyncExternalStore(onLg, () => window.matchMedia(LG).matches, () => false);
  const closeFilters = useCallback(() => setFiltersOpen(false), []); // stable: ui/Sheet refocuses on a new onClose
  const key = JSON.stringify([id, anchor.lat, anchor.lng, attempt]);
  useEffect(() => {
    let live = true;
    Promise.all([api.product(id), api.offerRows(id, anchor)])
      .then(([product, rows]) => live && setRes({ key, product, rows, now: new Date() }))
      .catch((e) => live && setRes({ key, error: true, missing: e instanceof ApiError && e.status === 404 }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers every input
  }, [key]);

  const cur = res?.key === key ? res : null;
  const all = cur?.rows;
  const rows = useMemo(() => (all ? sortRows(applyFilters(all, state.filters, cur?.now), state.sort) : []), [all, state.filters, state.sort, cur?.now]);
  const changeModel = (
    <Btn variant="ghost" icon={ArrowLeft} onClick={() => dispatch({ type: "GO", stage: "products" })}>
      تغییر مدل
    </Btn>
  );

  if (cur?.missing)
    return <EmptyState pose="stuck" title="این مدل پیدا نشد" body="شاید لینک قدیمی یا اشتباه باشه." actions={changeModel} />;

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
  // From every offer, not the filtered list: Plan B can pick a shop the filters hide.
  const open = all?.find((r) => r.store.id === state.selectedStoreId) ?? null;

  return (
    <>
      <div data-page-head className="mt-4 flex animate-rise items-start gap-3">
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
          <div className="mt-4 flex md:hidden">
            <ViewSwitch />
          </div>
          {/* Sticky under the top bar so sort and filters stay in reach while the rows scroll. Solid paper: no backdrop-filter on low-end phones (D11). */}
          <div className="sticky top-(--bar) z-20 -mx-4 mt-2 flex min-h-(--tools) items-center bg-paper px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
            <Toolbar onFilters={() => setFiltersOpen(true)} />
          </div>
          {/* lg: the list takes the inline-start 440 px (where the store sheet docks), the map fills the rest and stays put. */}
          <div className="mt-2 grid gap-4 md:grid-cols-2 md:items-start lg:grid-cols-[440px_minmax(0,1fr)]">
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
                    {rows.map((r, i) => (
                      <li key={r.offer.offerId} style={{ "--i": i } as CSSProperties} className="animate-rise stagger">
                        <ShopRow
                          row={r}
                          now={cur!.now!}
                          active={r.store.id === state.selectedStoreId}
                          onHover={setHovered}
                          onOpen={() => dispatch({ type: "OPEN_STORE", id: r.store.id })}
                        />
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[12px] leading-5 text-ink-muted">
                    قیمت‌ها «آخرین قیمتِ ثبت‌شده‌ی فروشگاه»اند و به‌روز بودنشان تضمین نمی‌شود؛ قبل از رفتن زنگ بزن.
                  </p>
                </>
              )}
            </div>
            <div className={`md:sticky md:top-[calc(var(--bar)+var(--tools)+4px)] lg:aspect-square lg:max-h-[calc(100dvh-var(--bar)-var(--tools)-20px)] ${state.radarView === "list" ? "hidden md:block" : ""}`}>
              {all && (
                <DistrictMap
                  rows={rows}
                  anchor={anchor}
                  selectedId={state.selectedStoreId ?? undefined}
                  hoveredId={hovered}
                  onSelect={(sid) => dispatch({ type: "OPEN_STORE", id: sid })}
                  radiusKm={state.filters.maxDistanceKm ?? undefined}
                  fill={lg}
                  dropKey={key}
                />
              )}
            </div>
          </div>
        </>
      )}

      <FilterPanel open={filtersOpen} onClose={closeFilters} prices={all?.map((r) => r.offer.priceToman) ?? []} shown={rows.length} />
      <StoreSheet row={open} anchor={anchor} now={cur?.now ?? new Date()} />
      <Suspense fallback={null}>
        <PlanB rows={all} />
      </Suspense>
    </>
  );
}

export default function RadarPage() {
  const { productId } = useParams<{ productId: string }>();
  return (
    <JourneyShell stage="radar" productId={productId}>
      {/* --bar: the TopBar's height; --tools: the sticky toolbar band. The map sticks below both. */}
      <main className="page pb-32 pt-2 [--bar:60px] [--tools:60px]">
        <Radar id={productId} />
      </main>
    </JourneyShell>
  );
}
