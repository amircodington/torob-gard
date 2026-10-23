"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { LogOut, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { faFreshness, faNum, faPriceFull } from "../../lib/fa";
import { toAsciiDigits } from "../../lib/persian";
import { clearSavedTrips } from "../../lib/sw";
import type { Me, NeedsProfile } from "../../lib/types";
import { Btn, btnClass } from "../ui/Btn";
import { Chip } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";

const CARD = "rounded-lg bg-surface p-5 shadow-card";
const FIELD = "tabular mt-1 min-h-11 w-full rounded-md bg-surface-tint px-3 text-[16px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-focus";
const STATE_FA = { liked: "پسندیدی", bought: "خریدی" } as const;
const date = (iso: string) => new Date(iso).toLocaleDateString("fa-IR");
const minAgo = (iso: string) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));

/** «۲۰٬۰۰۰٬۰۰۰» or "20000000" → 20000000; empty → null. */
export const parseToman = (v: string): number | null => {
  const d = toAsciiDigits(v).replace(/\D/g, "");
  return d ? Number(d) : null;
};
export const parseList = (v: string) => v.split(/[،,]/).map((x) => x.trim()).filter(Boolean).slice(0, 20);

export function MePage() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [gone, setGone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.me().then(setMe, () => setFailed(true));
  }, []);

  if (failed) return <EmptyState pose="stuck" title="به سرور ترب‌گرد نرسیدم" body="یه کم بعد دوباره امتحان کن." />;
  if (gone) return <EmptyState pose="wave" title="همه‌ی داده‌هات پاک شد" body="سفرها، چیزهایی که پسندیدی و خریدی و چیزهایی که درباره‌ت می‌دونستیم دیگه نیستن." actions={<Link href="/" className={btnClass()}>صفحه‌ی اول</Link>} />;
  if (me === undefined) return <p role="status" className="text-ink-muted">یه لحظه…</p>;
  if (me === null)
    return (
      <EmptyState
        pose="idle"
        title="هنوز وارد نشدی"
        body="روی صفحه‌ی سفر «ذخیره‌ی سفر» رو بزن و با شماره‌ت وارد شو؛ سفرهات اینجا جمع می‌شن."
        actions={<Link href="/start" className={btnClass()}>شروع کن</Link>}
      />
    );

  const items = me.memory.filter((m) => m.state === "liked" || m.state === "bought");
  const out = async () => {
    await api.logout();
    await clearSavedTrips();
    setMe(null);
  };
  return (
    <>
      <h1 className="mb-3 text-[34px] leading-[48px] font-light">
        صفحه‌ی <span className="font-extrabold">من</span>
      </h1>
      {me.phoneMasked && (
        <p className="-mt-3 mb-2 text-[13px] text-ink-muted">
          وارد شدی با <span dir="ltr" className="tabular">{faNum(me.phoneMasked)}</span>
        </p>
      )}

      <section className={CARD} aria-labelledby="trips-h">
        <h2 id="trips-h" className="text-[15px] font-extrabold">سفرهام</h2>
        {me.trips.length === 0 ? (
          <p className="mt-1 text-[15px] text-ink-muted">هنوز سفری ذخیره نکردی.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {me.trips.map((t) => (
              <li key={t.id}>
                <Link href={`/trip/${t.id}`} className="flex min-h-11 flex-col py-3 focus-visible:outline-2 focus-visible:outline-focus">
                  <span className="break-words text-[15px] font-bold leading-6">{t.product.title}</span>
                  <span className="break-words text-[13px] text-ink-muted">
                    {t.shop ? [t.shop.name, t.shop.mall].filter(Boolean).join(" · ") : "فروشگاه انتخاب نشده"} · {date(t.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={CARD} aria-labelledby="items-h">
        <h2 id="items-h" className="text-[15px] font-extrabold">پسندیدم و خریدم</h2>
        {items.length === 0 ? (
          <p className="mt-1 text-[15px] text-ink-muted">هنوز چیزی رو نپسندیدی یا نخریدی.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {items.map((m) => (
              <li key={m.id} className="flex items-start gap-3 py-3">
                <Chip label={STATE_FA[m.state as keyof typeof STATE_FA]} />
                <div className="min-w-0">
                  {m.productId ? (
                    <Link href={`/product/${m.productId}`} className="break-words text-[15px] font-bold leading-6 underline-offset-4 hover:underline">
                      {m.productTitle ?? "کالا"}
                    </Link>
                  ) : (
                    <p className="text-[15px] font-bold leading-6 text-ink-muted">کالا ثبت نشده</p>
                  )}
                  <p className="break-words text-[13px] leading-5 text-ink-muted">
                    {m.shopName ?? "مغازه ثبت نشده"}
                    {m.priceSeen != null && <> · قیمتی که دیدی {faPriceFull(m.priceSeen)} ({faFreshness(minAgo(m.createdAt))})</>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProfileForm profile={me.profile} onSaved={(profile) => setMe({ ...me, profile })} />

      <section className={`${CARD} flex flex-col gap-3`}>
        <Btn variant="ghost" icon={LogOut} onClick={out}>خروج</Btn>
        <DeleteData onDeleted={() => setGone(true)} />
      </section>
    </>
  );
}

function ProfileForm({ profile, onSaved }: { profile: NeedsProfile; onSaved: (p: NeedsProfile) => void }) {
  const [f, setF] = useState({
    min: profile.budgetMin != null ? String(profile.budgetMin) : "",
    max: profile.budgetMax != null ? String(profile.budgetMax) : "",
    likes: profile.preferredBrands.join("، "),
    avoids: profile.avoidedBrands.join("، "),
    notes: profile.notes,
  });
  const [status, setStatus] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    setF({ ...f, [k]: e.target.value });
    setStatus("idle");
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("busy");
    try {
      onSaved(await api.patchProfile({
        budgetMin: parseToman(f.min), budgetMax: parseToman(f.max),
        preferredBrands: parseList(f.likes), avoidedBrands: parseList(f.avoids), notes: f.notes,
      }));
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };
  return (
    <form onSubmit={save} className={CARD} aria-labelledby="profile-h">
      <h2 id="profile-h" className="text-[15px] font-extrabold">چیزهایی که درباره‌ت می‌دونم</h2>
      <p className="mt-1 text-[13px] leading-5 text-ink-muted">از گفتگوهامون فهمیدم؛ هر چی درست نیست رو عوض کن یا پاک کن.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-[12px] font-semibold text-ink-muted">
          بودجه از (تومان)
          <input value={f.min} onChange={set("min")} inputMode="numeric" dir="ltr" className={FIELD} />
        </label>
        <label className="text-[12px] font-semibold text-ink-muted">
          تا (تومان)
          <input value={f.max} onChange={set("max")} inputMode="numeric" dir="ltr" className={FIELD} />
        </label>
      </div>
      <label className="mt-2 block text-[12px] font-semibold text-ink-muted">
        برندهایی که دوست داری (با «،» جدا کن)
        <input value={f.likes} onChange={set("likes")} className={FIELD} />
      </label>
      <label className="mt-2 block text-[12px] font-semibold text-ink-muted">
        برندهایی که نمی‌خوای
        <input value={f.avoids} onChange={set("avoids")} className={FIELD} />
      </label>
      <label className="mt-2 block text-[12px] font-semibold text-ink-muted">
        یادداشت
        <textarea value={f.notes} onChange={set("notes")} maxLength={2000} rows={3} className={`${FIELD} py-2 leading-6`} />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <Btn type="submit" disabled={status === "busy"}>ذخیره</Btn>
        <p role="status" className="text-[13px] text-ink-muted">
          {status === "saved" ? "ذخیره شد" : status === "error" ? "ذخیره نشد؛ دوباره امتحان کن." : ""}
        </p>
      </div>
    </form>
  );
}

function DeleteData({ onDeleted }: { onDeleted: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState(false);
  if (!confirm)
    return <Btn variant="ghost" icon={Trash2} onClick={() => setConfirm(true)}>حذف داده‌هام</Btn>;
  const go = async () => {
    try {
      await api.deleteMe();
      await clearSavedTrips();
      onDeleted();
    } catch {
      setError(true);
    }
  };
  return (
    <div role="group" aria-label="حذف داده‌ها" className="rounded-md bg-surface-tint p-4">
      <p className="text-[15px] font-bold leading-6">مطمئنی؟</p>
      <p className="mt-1 text-[13px] leading-5 text-ink-muted">حسابت، همه‌ی سفرها، چیزهایی که پسندیدی و خریدی و چیزهایی که درباره‌ت می‌دونم پاک می‌شن. گفتگوها بی‌نام می‌مونن. برگشتی نداره.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="panel" onClick={go}>آره، پاک کن</Btn>
        <Btn variant="ghost" onClick={() => setConfirm(false)}>نه</Btn>
      </div>
      {error && <p role="alert" className="mt-2 text-[13px]">پاک نشد؛ به سرور نرسیدم. دوباره امتحان کن.</p>}
    </div>
  );
}
