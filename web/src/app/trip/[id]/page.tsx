import { JourneyShell } from "../../../components/JourneyShell";
import { Checklist } from "../../../components/trip/Checklist";
import { loadTrip } from "../../../components/trip/load";

export const metadata = { title: "چک‌لیست قبل از حرکت" };

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { trip, rows, rowsFailed } = await loadTrip((await params).id);
  return (
    <JourneyShell stage="summary" productId={trip.productId}>
      <main className="page pb-16 pt-2">
        <Checklist trip={trip} rows={rows} rowsFailed={rowsFailed} />
      </main>
    </JourneyShell>
  );
}
