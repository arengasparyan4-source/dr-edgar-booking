"use client";

import type { BookingStatus } from "@/types/domain";
import { useLanguage } from "@/lib/i18n/useLanguage";

export const BOOKING_STATUS_STYLES: Record<
  BookingStatus,
  { dotClass: string; badgeClass: string; panelClass: string }
> = {
  pending: {
    dotClass: "bg-amber-400",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    panelClass: "border-amber-200 bg-amber-50"
  },
  confirmed: {
    dotClass: "bg-emerald-500",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    panelClass: "border-emerald-200 bg-emerald-50"
  },
  cancelled: {
    dotClass: "bg-red-500",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
    panelClass: "border-red-200 bg-red-50"
  },
  reschedule_requested: {
    dotClass: "bg-violet-500",
    badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
    panelClass: "border-violet-200 bg-violet-50"
  },
  completed: {
    dotClass: "bg-slate-400",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
    panelClass: "border-slate-200 bg-slate-50"
  },
  no_show: {
    dotClass: "bg-orange-500",
    badgeClass: "border-orange-200 bg-orange-50 text-orange-800",
    panelClass: "border-orange-200 bg-orange-50"
  }
};

export default function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useLanguage();
  const style = BOOKING_STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${style.badgeClass}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${style.dotClass}`} aria-hidden="true" />
      {t.status[status]}
    </span>
  );
}
