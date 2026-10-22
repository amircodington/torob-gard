import { Mascot } from "../components/Mascot";

// ponytail: placeholder until the P1 home screen; no routes or buttons yet.
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <Mascot pose="wave" className="h-auto w-48" />
      <h1 className="text-[40px] leading-[44px]">
        <span className="font-light">ترب‌</span>
        <span className="font-extrabold">گرد</span>
      </h1>
      <p className="text-[15px] leading-6 text-ink-muted">از چی بخرم تا از کجا بخرم!</p>
    </main>
  );
}
