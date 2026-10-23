"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { api } from "../../lib/api";
import type { Me } from "../../lib/types";
import { useSession } from "../../state/session";
import { OtpSheet } from "../auth/OtpSheet";
import { Mascot } from "../Mascot";
import { Btn, btnClass } from "../ui/Btn";

const BURST = 8;

/** Right after the code is verified (rare, once): the celebrate radish pops in while 8 dots burst 40 px out over it (600 ms). Reduced motion: the radish fades in, no dots. */
function Celebrate() {
  return (
    <span aria-hidden className="relative shrink-0">
      <Mascot pose="celebrate" react="pop" className="block size-14" />
      {Array.from({ length: BURST }, (_, i) => {
        const a = (i / BURST) * 2 * Math.PI;
        const to = { "--x": `${Math.round(Math.cos(a) * 40)}px`, "--y": `${Math.round(Math.sin(a) * 40)}px` } as CSSProperties;
        return <span key={i} style={to} className={`absolute top-1/2 left-1/2 -mt-[3px] -ml-[3px] size-1.5 animate-confetti rounded-full opacity-0 ${i % 2 ? "bg-verified" : "bg-orange"}`} />;
      })}
    </span>
  );
}

/** «ذخیره‌ی سفر»: a guest logs in with their phone (the only place the OTP sheet opens); a logged-in shopper sees where it went. */
export function SaveTrip({ tripId }: { tripId: string }) {
  const { state } = useSession();
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined = still asking
  const [open, setOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false); // the bookmark wiggles once, right after the login saved it

  useEffect(() => {
    api.me().then(setMe, () => setMe(null));
  }, []);

  if (me === undefined) return null;
  if (me) {
    const saved = me.trips.some((t) => t.id === tripId);
    return (
      <>
        {justSaved && (
          <p role="status" className="mt-3 flex items-center gap-2 text-[15px] font-extrabold">
            <Celebrate />
            {/* honest: only «saved» when this trip is in the account; a shared link only logged you in */}
            {saved ? "سفرت ذخیره شد!" : "وارد شدی!"}
          </p>
        )}
        <Link href="/me" className={`${btnClass("ghost")} mt-3 w-full`}>
          <BookmarkCheck aria-hidden className={`size-5 ${justSaved ? "animate-wiggle" : ""}`} />
          {/* honest: a trip someone else made (a shared link) does not move into your account */}
          {saved ? "تو حسابت ذخیره شده — صفحه‌ی من" : "صفحه‌ی من"}
        </Link>
      </>
    );
  }
  return (
    <>
      <Btn variant="ghost" icon={BookmarkPlus} iconClass="hover-wiggle" className="mt-3 w-full" onClick={() => setOpen(true)}>
        ذخیره‌ی سفر
      </Btn>
      <OtpSheet
        open={open}
        onClose={() => setOpen(false)}
        agentSessionId={state.agentSessionId}
        onDone={(m) => {
          setOpen(false);
          setJustSaved(true);
          setMe(m);
        }}
      />
    </>
  );
}
