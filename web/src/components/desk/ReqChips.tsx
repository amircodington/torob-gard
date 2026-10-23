"use client";

import { Pencil, Wallet } from "lucide-react";
import { CAT_LABEL, reqBudget, reqPriority, type JourneyReq } from "../../state/session";
import { Chip } from "../ui/Chip";
import { chipIcon } from "../ui/chipIcon";


/** What the desk was built from; a custom band already carries its «{min} تا {max} میلیون» label. No onEdit, no «ویرایش». */
export function ReqChips({ req, onEdit, className = "" }: { req: JourneyReq; onEdit?: () => void; className?: string }) {
  const budget = reqBudget(req);
  const prio = reqPriority(req);
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {req.category && <Chip label={CAT_LABEL[req.category]} icon={chipIcon(`cat:${req.category}`) ?? undefined} />}
      <Chip label={`بودجه: ${budget ? budget.label : "مشخص نشده"}`} icon={Wallet} />
      <Chip label={`اولویت: ${prio ? prio.label : "مشخص نشده"}`} icon={(prio && chipIcon(`prio:${prio.id}`)) ?? undefined} />
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-11 items-center gap-1 rounded-pill px-3 text-[13px] font-bold text-orange-deep press hover:bg-orange-tint focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Pencil aria-hidden className="hover-wiggle size-4" />
          ویرایش
        </button>
      )}
    </div>
  );
}
