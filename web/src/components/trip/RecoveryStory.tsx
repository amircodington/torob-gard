import { FAIL_COPY } from "../../lib/ranking";
import type { FailureRecord } from "../../lib/types";

/** The trip's Plan B history; a trip without failures says it went to plan from the start. */
export function RecoveryStory({ failures, names, finalName }: { failures: FailureRecord[]; names: Record<string, string>; finalName: string }) {
  return (
    <section className="mt-3 rounded-lg bg-surface p-5 shadow-card">
      <h2 className="text-[15px] font-extrabold">روایت این سفر</h2>
      <ul className="mt-2 grid gap-1.5 text-[13px] leading-5 text-ink-muted">
        {failures.length === 0 ? (
          <li>از شروع همین فروشگاه بوده؛ هنوز پلن B لازم نشده.</li>
        ) : (
          failures.map((f) => (
            <li key={f.storeId + f.at} className="break-words">
              <span className="font-bold text-ink">{names[f.storeId] ?? "یک فروشگاه"}</span> — {FAIL_COPY[f.reason].title}؛ با پلن B جایگزین شد.
            </li>
          ))
        )}
        <li className="break-words">
          مقصد فعلی: <span className="font-bold text-ink">{finalName}</span>
        </li>
      </ul>
    </section>
  );
}
