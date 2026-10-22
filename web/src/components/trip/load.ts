import { notFound } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import type { OfferRow, Trip } from "../../lib/types";

/** Server-side: the trip and its product's offer rows (from the trip's anchor). 404 → notFound(). */
export async function loadTrip(id: string): Promise<{ trip: Trip; rows: OfferRow[]; rowsFailed: boolean }> {
  // ponytail: lib/api reads API_URL per call; defaulting it here lets the server reuse the typed client.
  process.env.API_URL ??= "http://localhost:8000";
  let trip: Trip;
  try {
    trip = await api.trip(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const { lat, lng } = trip.anchor;
  // Rows feed price, freshness and Plan B; without them the page still shows the plan, and says the price is unavailable.
  let rowsFailed = false;
  const rows = await api.offerRows(trip.productId, lat != null && lng != null ? { lat, lng } : undefined).catch(() => {
    rowsFailed = true;
    return [];
  });
  return { trip, rows, rowsFailed };
}
