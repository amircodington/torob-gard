"use client";

import { useState } from "react";
import { DEFAULT_LANDMARK, LANDMARKS, type LandmarkId } from "../../lib/geo";
import { Chip } from "../ui/Chip";

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
      <div className="flex flex-wrap gap-2" role="group" aria-label="فاصله از کجا">
        <Chip label={asking ? "در حال پیدا کردن…" : "موقعیت من"} selected={anchor.landmark === null} onClick={locate} />
        {(Object.keys(LANDMARKS) as LandmarkId[]).map((id) => (
          <Chip key={id} label={LANDMARKS[id].name} selected={anchor.landmark === id} onClick={() => onChange(landmarkAnchor(id))} />
        ))}
      </div>
      <p className="mt-1 text-[13px] leading-5 text-ink-muted" aria-live="polite">
        فاصله‌ها از {anchor.label} حساب شده
      </p>
    </div>
  );
}
