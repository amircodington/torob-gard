"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { api } from "../../lib/api";
import type { Me } from "../../lib/types";
import { useSession } from "../../state/session";
import { OtpSheet } from "../auth/OtpSheet";
import { Btn, btnClass } from "../ui/Btn";

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
      <Link href="/me" className={`${btnClass("ghost")} mt-3 w-full`}>
        <BookmarkCheck aria-hidden className={`size-5 ${justSaved ? "animate-wiggle" : ""}`} />
        {/* honest: a trip someone else made (a shared link) does not move into your account */}
        {saved ? "تو حسابت ذخیره شده — صفحه‌ی من" : "صفحه‌ی من"}
      </Link>
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
