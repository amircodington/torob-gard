import { JourneyShell } from "../../../../components/JourneyShell";
import { loadTrip } from "../../../../components/trip/load";
import { WalkSheet } from "../../../../components/trip/WalkSheet";

export const metadata = { title: "مسیر" };

export default async function WalkPage({ params }: { params: Promise<{ id: string }> }) {
  const { trip, rows, rowsFailed } = await loadTrip((await params).id);
  return (
    <JourneyShell stage="summary" productId={trip.productId}>
      <WalkSheet trip={trip} rows={rows} rowsFailed={rowsFailed} />
    </JourneyShell>
  );
}
