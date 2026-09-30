"use client";

import type { Booking } from "@/types/domain";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { BOOKING_STATUS_STYLES } from "./BookingStatusBadge";
import { getCategoryMeta, getPrimaryService } from "./ServiceCategoryBadge";

const formatShortName = (booking: Booking) =>
  `${booking.firstName} ${booking.lastName}`.trim();

export default function CalendarDayCell({
  date,
  dateKey,
  bookings,
  freeCount = 0,
  isCurrentMonth,
  isToday,
  isSelected,
  onSelect
}: {
  date: Date;
  dateKey: string;
  bookings: Booking[];
  freeCount?: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (dateKey: string) => void;
}) {
  const { t } = useLanguage();
  const previewBookings = bookings.slice(0, 3);
  const extraCount = Math.max(bookings.length - previewBookings.length, 0);
  const categoryDots = bookings.slice(0, 7).map((booking) => {
    const category = getPrimaryService(booking.servicesSnapshot)?.category;
    return getCategoryMeta(category);
  });

  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey)}
      className={`group flex min-h-36 w-full flex-col rounded-3xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-soft focus:outline-none focus:ring-4 focus:ring-blush/25 sm:min-h-40 lg:min-h-44 ${
        isSelected
          ? "border-ink bg-white shadow-premium"
          : "border-champagne/60 bg-white/82 shadow-sm"
      } ${isCurrentMonth ? "" : "opacity-45"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-2xl px-2 text-sm font-semibold ${
              isToday ? "bg-ink text-white" : "bg-pearl text-graphite"
            }`}
          >
            {date.getDate()}
          </span>
          <p className="mt-2 text-xs font-semibold text-graphite/55">
            {bookings.length
              ? `${bookings.length} ${t.calendar.bookings}`
              : t.calendar.noBookingsThisDay}
          </p>
          {freeCount > 0 ? (
            <p className="mt-1 text-xs font-semibold text-sage">
              {freeCount} {t.calendar.freeSlots}
            </p>
          ) : null}
        </div>

        {bookings.length ? (
          <div className="flex max-w-[5.5rem] flex-wrap justify-end gap-1">
            {categoryDots.map((meta, index) => (
              <span
                key={`${dateKey}-${index}`}
                className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`}
                aria-hidden="true"
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid gap-1.5">
        {previewBookings.map((booking) => {
          const primaryService = getPrimaryService(booking.servicesSnapshot);
          const category = getCategoryMeta(primaryService?.category);
          const status = BOOKING_STATUS_STYLES[booking.status];

          return (
            <div
              key={booking.id}
              className={`rounded-2xl border bg-porcelain px-2.5 py-2 ${status.panelClass}`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${category.dotClass}`} />
                <span className="truncate text-xs font-bold">
                  {booking.startTime} {formatShortName(booking)}
                </span>
              </div>
            </div>
          );
        })}
        {extraCount > 0 ? (
          <span className="rounded-2xl bg-pearl px-3 py-2 text-xs font-semibold text-graphite/70">
            +{extraCount} {t.calendar.more}
          </span>
        ) : null}
      </div>
    </button>
  );
}
