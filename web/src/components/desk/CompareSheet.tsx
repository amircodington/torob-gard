"use client";

import { faFreshness, faNum, faPrice, isStale } from "../../lib/fa";
import type { DeskTier } from "../../lib/types";
import { Btn } from "../ui/Btn";
import { Sheet } from "../ui/Sheet";
import { TIER_LABEL } from "./TierCard";

const td = "border-b border-panel-2 p-2 align-top text-[13px] leading-5";
const th = `${td} font-bold text-on-dark/60`;

/** The prototype's CompareTable inside the black sheet; at most three models (the reducer caps it). */
export function CompareSheet({
  open,
  onClose,
  tiers,
  hasPriority,
  now,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  tiers: DeskTier[];
  hasPriority: boolean;
  /** When the tiers were fetched; ages are counted from it (render stays pure). */
  now: number;
  onPick: (id: string) => void;
}) {
  const specLabels = [...new Set(tiers.flatMap((t) => t.specsTop3.map((s) => s.label)))];
  return (
    <Sheet open={open} onClose={onClose} labelledby="compare-title">
      <div className="pe-12">
        <h2 id="compare-title" className="text-[20px] leading-8">
          <span className="font-light">مقایسه‌ی </span>
          <span className="font-extrabold">رو در رو</span>
        </h2>
        <p className="mt-1 text-[13px] leading-6 text-on-dark/70">هیچ‌کدام «بهترینِ مطلق» نیستند؛ هر کدام یک مصالحه‌ی متفاوت با نیازهای توست.</p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] border-separate border-spacing-0 text-start">
          <thead>
            <tr>
              <th className={`${th} w-24`}>مدل‌ها</th>
              {tiers.map((t) => (
                <th key={t.productId} className={`${td} text-start`}>
                  <span className="mb-1 inline-block rounded-pill bg-panel-2 px-2 py-0.5 text-[12px] font-bold">{TIER_LABEL[t.tier]}</span>
                  <span className="block font-extrabold">{t.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={th}>قیمت از</td>
              {tiers.map((t) => (
                <td key={t.productId} className={`${td} tabular font-bold`}>{faPrice(t.price)}</td>
              ))}
            </tr>
            <tr>
              <td className={th}>به‌روزرسانی</td>
              {tiers.map((t) => {
                const min = t.newestPriceAt ? Math.max(0, Math.round((now - Date.parse(t.newestPriceAt)) / 60_000)) : null;
                return (
                  <td key={t.productId} className={td}>
                    {min == null ? "ثبت نشده" : `${faFreshness(min)}${isStale(min) ? " · ممکن است تغییر کرده باشد" : ""}`}
                  </td>
                );
              })}
            </tr>
            {specLabels.map((label) => (
              <tr key={label}>
                <td className={th}>{label}</td>
                {tiers.map((t) => (
                  <td key={t.productId} className={td}>{faNum(t.specsTop3.find((s) => s.label === label)?.value ?? "—")}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td className={th}>تناسب با اولویت تو</td>
              {tiers.map((t) => (
                <td key={t.productId} className={`${td} font-bold`}>
                  {!hasPriority ? "اولویتی ثبت نشده" : t.fitsPriority ? <span className="text-verified">هم‌خوان</span> : "مصالحه"}
                </td>
              ))}
            </tr>
            <tr>
              <td className={th}>مصالحه‌ی اصلی</td>
              {tiers.map((t) => (
                <td key={t.productId} className={`${td} text-on-dark/70`}>{t.tradeoffs[0] ? faNum(t.tradeoffs[0]) : "—"}</td>
              ))}
            </tr>
            <tr>
              <td />
              {tiers.map((t) => (
                <td key={t.productId} className="p-2">
                  <Btn className="w-full" onClick={() => onPick(t.productId)}>انتخاب</Btn>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Sheet>
  );
}
