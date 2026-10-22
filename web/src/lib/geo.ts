/* Downtown Tehran landmarks and the schematic map projection. */

export const LANDMARKS = {
  saadi: { name: "مترو سعدی", lat: 35.6907, lng: 51.413 }, // default anchor
  baharestan: { name: "میدان بهارستان", lat: 35.692, lng: 51.431 },
  istanbul: { name: "چهارراه استانبول", lat: 35.6935, lng: 51.418 },
  aladdin2: { name: "پاساژ علاءالدین ۲", lat: 35.695, lng: 51.4071 },
} as const;

export type LandmarkId = keyof typeof LANDMARKS;

export const BBOX = { lat: [35.684, 35.704], lng: [51.398, 51.438] } as const;

/** 0–100 map coords, y grows southwards; null outside the bbox. */
export function project(lat: number, lng: number): { x: number; y: number } | null {
  const x = ((lng - BBOX.lng[0]) / (BBOX.lng[1] - BBOX.lng[0])) * 100;
  const y = ((BBOX.lat[1] - lat) / (BBOX.lat[1] - BBOX.lat[0])) * 100;
  if (x < 0 || x > 100 || y < 0 || y > 100) return null;
  return { x: Math.round(x * 1e6) / 1e6, y: Math.round(y * 1e6) / 1e6 };
}

// ponytail: client-side fallback only; the API's PostGIS distance_m wins when present.
export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}
