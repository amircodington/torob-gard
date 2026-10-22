"use client";

import Link from "next/link";
import { Mascot } from "../components/Mascot";
import { Btn } from "../components/ui/Btn";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 pt-16 pb-12 text-center">
      <Mascot pose="stuck" react="shake" className="size-44" />
      <h1 className="mt-8 text-[28px] leading-10 font-extrabold">یه مشکلی پیش اومد</h1>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Btn onClick={reset}>تلاش دوباره</Btn>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-pill bg-surface-tint px-4 text-[15px] font-bold">
          برگشت به خانه
        </Link>
      </div>
    </main>
  );
}
