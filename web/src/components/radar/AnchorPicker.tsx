"use client";

import { useState } from "react";
import { DEFAULT_LANDMARK, LANDMARKS, type LandmarkId } from "../../lib/geo";
import { Building2, Landmark, Loader2, LocateFixed, TrainFront, type LucideIcon } from "lucide-react";
import { Chip } from "../ui/Chip";
import { ChipGroup } from "../ui/ChipGroup";

const ICONS: Record<LandmarkId, LucideIcon> = { saadi: TrainFront, baharestan: Landmark, istanbul: Landmark, aladdin2: Building2 };
// Bounded loop: spins only while the phone is asked (≤ 5 s timeout).
const Spinner = ((p: { className?: string }) => <Loader2 {...p} className={`${p.className} motion-safe:animate-spin`} />) as unknown as LucideIcon;

export interface RadarAnchor {
  lat: number;
  lng: number;
  label: string; // «مترو سعدی», «موقعیت تو»
  landmark: LandmarkId | null; // null = the phone's own position
}

export const landmarkAnchor = (id: LandmarkId): RadarAnchor => ({ ...LANDMARKS[id], label: LANDMARKS[id].name, landmark: id });

/** «موقعیت من» or a landmark chip; the phone's position is used for this page only and never stored. */
export function AnchorPicker({ anchor, onChange }: { anchor: RadarAnchor; onChange: (a: RadarAnchor) => void }) {
  const [asking, setAsking] = useState(false);

  const locate = () => {
    const fallback = () => {
      setAsking(false);
      onChange(landmarkAnchor(DEFAULT_LANDMARK));
    };
    if (!navigator.geolocation) return fallback();
    setAsking(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setAsking(false);
        onChange({ lat: p.coords.latitude, lng: p.coords.longitude, label: "موقعیت تو", landmark: null });
      },
      fallback,
      { timeout: 5000, maximumAge: 60_000 },
    );
  };

  return (
    <div>
      <ChipGroup label="فاصله از کجا">
        <Chip label={asking ? "در حال پیدا کردن…" : "موقعیت من"} icon={asking ? Spinner : LocateFixed} selected={anchor.landmark === null} onClick={locate} />
        {(Object.keys(LANDMARKS) as LandmarkId[]).map((id) => (
          <Chip key={id} label={LANDMARKS[id].name} icon={ICONS[id]} selected={anchor.landmark === id} onClick={() => onChange(landmarkAnchor(id))} />
        ))}
      </ChipGroup>
      <p className="mt-1 text-[13px] leading-5 text-ink-muted" aria-live="polite">
        فاصله‌ها از {anchor.label} حساب شده
      </p>
    </div>
  );
}
