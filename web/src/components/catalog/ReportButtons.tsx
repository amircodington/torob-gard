"use client";

import { DoorClosed, DoorOpen, PhoneOff, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { api, type ReportInput } from "../../lib/api";
import { Btn } from "../ui/Btn";

// Shop-level signals; «موجود نبود» needs a product, so it lives on the radar's store sheet.
const KINDS: { label: string; kind: ReportInput["kind"]; icon: LucideIcon }[] = [
  { label: "باز بود", kind: "open", icon: DoorOpen },
  { label: "بسته بود", kind: "closed", icon: DoorClosed },
  { label: "جواب ندادن", kind: "no_answer", icon: PhoneOff },
];

export function ReportButtons({ shopId }: { shopId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "failed">("idle");
  const send = async (kind: ReportInput["kind"]) => {
    setState("busy");
    setState(await api.report({ shopId, kind }).then(() => "sent" as const, () => "failed" as const));
  };
  return (
    <section data-testid="reports" aria-labelledby="reports-title" className="rounded-lg bg-surface p-5 shadow-card">
      <h2 id="reports-title" className="text-[15px] font-extrabold leading-6">امروز رفتی؟ به بقیه بگو</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {KINDS.map(({ label, kind, icon }) => (
          <Btn key={kind} variant="ghost" icon={icon} disabled={state === "busy" || state === "sent"} onClick={() => send(kind)}>
            {label}
          </Btn>
        ))}
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-[13px] leading-5 text-ink-muted">
        {state === "sent" ? "ممنون، ثبت شد." : state === "failed" ? "ثبت نشد؛ کمی بعد دوباره امتحان کن." : ""}
      </p>
    </section>
  );
}
