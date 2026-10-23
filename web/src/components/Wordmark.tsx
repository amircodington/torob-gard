"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mascotSrc } from "./Mascot";

// The icon's entrance plays on the first paint of a visit only; every journey page remounts the header.
let introPlayed = false;

/** The wordmark, always a way home: the icon tile and «ترب‌گرد» in Dana ExtraBold. */
export function Wordmark() {
  const [intro] = useState(() => !introPlayed); // fixed per mount, so a re-render never cuts the animation
  useEffect(() => {
    introPlayed = true;
  }, []);
  return (
    <Link
      href="/"
      className="group inline-flex min-h-11 items-center gap-2 rounded-pill text-[18px] leading-none font-extrabold focus-visible:outline-2 focus-visible:outline-focus"
    >
      {/* Two layers: the hop on hover must not restart the entrance when the pointer leaves. */}
      <span className="block origin-bottom group-hover:animate-hop">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mascotSrc("icon")}
          alt=""
          aria-hidden
          width={32}
          height={32}
          draggable={false}
          className={`block size-8 origin-[50%_85%] rounded-[10px] ${intro ? "animate-logo-in" : ""}`}
        />
      </span>
      ترب‌گرد
    </Link>
  );
}
