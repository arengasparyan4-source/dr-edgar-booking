"use client";

import type { Booking } from "@/types/domain";
import { summarizePeriod } from "@/lib/bookings/bookingStats";
import type { CalendarDaySchedule } from "@/lib/availability/calendarSchedule";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { BOOKING_STATUS_STYLES } from "./BookingStatusBadge";

type SummaryKey =
  | "summaryTotal"
  | "summaryConfirmed"
  | "summaryPending"
  | "summaryCancelled"
  | "summaryCompleted"
  | "summaryNoShow"
  | "summaryFreeSlots";

/**
 * Totals for the visible period. Counts every booking in the period
 * regardless of the status/search filters, so the numbers always add up.
 * "Pending" includes reschedule requests: both wait for an answer.
 */
export default function CalendarSummary({
  bookings,
  schedule
}: {
  bookings: Booking[];
  schedule: CalendarDaySchedule[];
}) {
  const { t } = useLanguage();
  const summary = summarizePeriod(
    bookings,
    schedule.map((day) => day.freeSlots.length)
  );
  const items: Array<{ key: SummaryKey; value: number; dot?: string }> = [
    { key: "summaryTotal", value: summary.total },
    { key: "summaryConfirmed", value: summary.confirmed, dot: BOOKING_STATUS_STYLES.confirmed.dotClass },
    { key: "summaryPending", value: summary.pending, dot: BOOKING_STATUS_STYLES.pending.dotClass },
    { key: "summaryCancelled", value: summary.cancelled, dot: BOOKING_STATUS_STYLES.cancelled.dotClass },
    { key: "summaryNoShow", value: summary.noShow, dot: BOOKING_STATUS_STYLES.no_show.dotClass },
    { key: "summaryCompleted", value: summary.completed, dot: BOOKING_STATUS_STYLES.completed.dotClass },
    { key: "summaryFreeSlots", value: summary.freeSlots, dot: "bg-sage" }
  ];

  return (
    <section
      className="rounded-[2rem] border border-champagne/70 bg-white/88 p-4 shadow-soft sm:p-5"
      data-testid="calendar-summary"
    >
      <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-graphite/55">
        {t.calendar.summaryTitle}
      </h3>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl bg-pearl p-3"
            title={item.key === "summaryFreeSlots" ? t.calendar.summaryFreeSlotsHint : undefined}
            data-testid={`summary-${item.key}`}
          >
            <dt className="flex items-center gap-2 text-xs font-semibold text-graphite/60">
              {item.dot ? <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.dot}`} aria-hidden="true" /> : null}
              {t.calendar[item.key]}
            </dt>
            <dd className="mt-1 text-2xl font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
