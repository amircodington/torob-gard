"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Pencil, RotateCw } from "lucide-react";
import { ApiError, api } from "../../lib/api";
import { toAsciiDigits, toFaDigits } from "../../lib/persian";
import type { Me } from "../../lib/types";
import { Btn } from "../ui/Btn";
import { Sheet } from "../ui/Sheet";

/** Persian/Arabic digits → ASCII, digits (and a leading +) only: «۰۹۱۲ ۱۲۳» → "0912123". The server normalises the rest. */
export const cleanPhone = (v: string) => toAsciiDigits(v).replace(/(?!^\+)[^\d]/g, "");
export const cleanCode = (v: string) => toAsciiDigits(v).replace(/\D/g, "").slice(0, 5);

const ERR: Record<string, Record<number, string>> = {
  phone: { 422: "این شماره‌ی موبایل درست نیست؛ مثل ۰۹۱۲۱۲۳۴۵۶۷ بنویس.", 429: "چند بار کد خواستی؛ یه کم بعد دوباره امتحان کن.", 503: "پیامک فعلاً فرستاده نمی‌شه؛ چند دقیقه‌ی دیگه امتحان کن." },
  code: { 400: "این کد درست نیست.", 422: "کد ۵ رقمیه.", 429: "چند بار کد اشتباه زدی؛ ۱۵ دقیقه‌ی دیگه دوباره امتحان کن." },
};
const errText = (step: "phone" | "code", e: unknown) =>
  (e instanceof ApiError && ERR[step][e.status]) || "به سرور ترب‌گرد نرسیدم؛ دوباره امتحان کن.";

const FIELD = "tabular mt-1 min-h-12 w-full rounded-md bg-panel-2 px-4 text-[16px] tracking-wide text-on-dark outline-none focus-visible:outline-2 focus-visible:outline-focus";

/** Phone → 5-digit SMS code → logged in. Opened only from «ذخیره‌ی سفر». */
export function OtpSheet({ open, onClose, onDone, agentSessionId }: { open: boolean; onClose: () => void; onDone: (me: Me) => void; agentSessionId?: string | null }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.requestOtp(cleanPhone(phone));
      setStep("code");
      setCode("");
    } catch (err) {
      setError(errText("phone", err));
    }
    setBusy(false);
  };

  const verify = async (value = code, e?: FormEvent) => {
    e?.preventDefault();
    if (value.length !== 5 || busy) return;
    setBusy(true);
    setError(null);
    try {
      onDone(await api.verifyOtp(cleanPhone(phone), value, agentSessionId));
    } catch (err) {
      setError(errText("code", err));
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} labelledby="otp-title" side="bottom">
      <h2 id="otp-title" className="text-[20px] font-extrabold leading-8">ذخیره‌ی سفر تو حسابت</h2>
      <p className="mt-1 text-[13px] leading-6 text-on-dark/70">
        با شماره‌ت وارد شو تا سفرها و چیزهایی که پسندیدی رو هر گوشی‌ای ببینی. شماره‌ت رمزنگاری‌شده نگه داشته می‌شه.{" "}
        <Link href="/privacy" className="underline underline-offset-4">حریم خصوصی</Link>
      </p>

      {step === "phone" ? (
        <form onSubmit={ask} className="mt-4">
          <label className="block text-[13px] font-semibold">
            شماره‌ی موبایل
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="۰۹۱۲ ۱۲۳ ۴۵۶۷"
              maxLength={20}
              autoFocus
              className={FIELD}
            />
          </label>
          <Btn type="submit" disabled={busy || cleanPhone(phone).length < 10} className="mt-4 w-full">
            کد رو بفرست
          </Btn>
        </form>
      ) : (
        <form onSubmit={(e) => verify(code, e)} className="mt-4 animate-rise">
          <label className="block text-[13px] font-semibold">
            کد ۵ رقمی که به <span dir="ltr" className="tabular">{toFaDigits(cleanPhone(phone))}</span> پیامک شد
            <input
              value={toFaDigits(code)}
              onChange={(e) => {
                const v = cleanCode(e.target.value);
                setCode(v);
                if (v.length === 5) verify(v); // pasted or autofilled from the SMS
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              autoFocus
              className={`${FIELD} text-center text-[22px] tracking-[0.5em]`}
            />
          </label>
          <Btn type="submit" disabled={busy || code.length !== 5} className="mt-4 w-full">
            ورود
          </Btn>
          <div className="mt-2 flex justify-between gap-2">
            <button type="button" onClick={() => { setStep("phone"); setError(null); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-[13px] text-on-dark/70 press hover:bg-white/10 hover:text-on-dark focus-visible:outline-2 focus-visible:outline-focus">
              <Pencil aria-hidden className="hover-wiggle size-4" />
              شماره رو عوض کن
            </button>
            <button type="button" disabled={busy} onClick={() => ask()} className="inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-[13px] text-on-dark/70 press hover:bg-white/10 hover:text-on-dark focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50">
              <RotateCw aria-hidden className={`size-4 ${busy ? "motion-safe:animate-spin" : "hover-spin [--spin:360deg]"}`} />
              دوباره بفرست
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[13px] leading-6 text-on-dark">
          {error}
        </p>
      )}
    </Sheet>
  );
}
