import Link from "next/link";
import { Mascot } from "../components/Mascot";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 pt-16 pb-12 text-center">
      <Mascot pose="stuck" react="shake" className="size-44" />
      <h1 className="mt-8 text-[28px] leading-10 font-light">
        این صفحه <span className="font-extrabold">پیدا نشد</span>
      </h1>
      <Link href="/" className="mt-8 inline-flex min-h-11 items-center rounded-pill bg-orange px-6 text-[15px] font-bold text-on-orange shadow-card active:scale-[0.97] transition-transform">
        برگشت به خانه
      </Link>
    </main>
  );
}
