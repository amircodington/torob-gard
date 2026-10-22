import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto max-w-md px-4 pb-6 pt-2 text-center text-[11px] font-semibold leading-5 text-ink-muted">
      <nav className="flex justify-center gap-4 text-[13px]">
        <Link href="/about" className="inline-flex min-h-11 items-center">درباره</Link>
        <Link href="/privacy" className="inline-flex min-h-11 items-center">حریم خصوصی</Link>
      </nav>
      ترب‌گرد — پروژه‌ی چالش ترب/استارکوچ؛ محصول رسمی ترب نیست.
    </footer>
  );
}
