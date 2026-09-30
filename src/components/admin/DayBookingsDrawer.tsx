"use client";

import { Phone, Plus, X } from "lucide-react";
import type { Booking } from "@/types/domain";
import { useLanguage } from "@/lib/i18n/useLanguage";
import BookingStatusBadge from "./BookingStatusBadge";
import ServiceCategoryBadge, { getCategoryMeta, getPrimaryService } from "./ServiceCategoryBadge";
import { formatDateTitle, formatMoney, parseDateKey } from "./calendarUtils";

const getClientName = (booking: Booking) =>
  `${booking.firstName} ${booking.lastName}`.trim();

export default function DayBookingsDrawer({
  isOpen,
  dateKey,
  bookings,
  onClose,
  onSelectBooking,
  onAddBooking
}: {
  isOpen: boolean;
  dateKey: string;
  bookings: Booking[];
  onClose: () => void;
  onSelectBooking: (booking: Booking) => void;
  onAddBooking: (dateKey: string) => void;
}) {
  const { language, t } = useLanguage();

  if (!isOpen) {
    return null;
  }

  const sortedBookings = [...bookings].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label={t.common.close}
        onClick={onClose}
        className="absolute inset-0 bg-ink/35 backdrop-blur-sm"
      />
      <aside className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[2rem] bg-[#F8F3EF] p-4 shadow-premium sm:p-6 lg:bottom-auto lg:left-auto lg:top-0 lg:h-full lg:max-h-none lg:w-[30rem] lg:rounded-l-[2rem] lg:rounded-tr-none">
        <div className="sticky top-0 z-10 -mx-4 -mt-4 bg-[#F8F3EF]/95 px-4 pb-4 pt-4 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/50">
                {t.calendar.bookings}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">
                {formatDateTitle(parseDateKey(dateKey), language)}
              </h2>
              <p className="mt-1 text-sm text-graphite/60">
                {sortedBookings.length} {t.calendar.bookings}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => onAddBooking(dateKey)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sage text-white shadow-sm"
                aria-label={t.calendar.addBooking}
                title={t.calendar.addBooking}
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ink shadow-sm"
                aria-label={t.common.close}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {sortedBookings.length ? (
          <div className="grid gap-3">
            {sortedBookings.map((booking) => {
              const primaryService = getPrimaryService(booking.servicesSnapshot);
              const category = getCategoryMeta(primaryService?.category);
              const extraServices = Math.max(booking.servicesSnapshot.length - 1, 0);

              return (
                <article
                  key={booking.id}
                  className={`rounded-3xl border border-champagne/70 border-l-4 bg-white/90 p-4 shadow-soft ${category.cardClass}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectBooking(booking)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">
                          {booking.startTime} - {booking.endTime}
                        </p>
                        <p className="mt-1 text-base font-semibold">{getClientName(booking)}</p>
                      </div>
                      <BookingStatusBadge status={booking.status} />
                    </div>

                    <p className="mt-2 text-sm text-graphite/70">{booking.phone}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <ServiceCategoryBadge category={primaryService?.category} />
                      <span className="rounded-full bg-pearl px-3 py-1 text-xs font-semibold text-graphite/70">
                        {booking.totalDurationMinutes} {t.common.minutes}
                      </span>
                      {extraServices ? (
                        <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
                          +{extraServices} {t.bookings.services}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-graphite">
                      {primaryService?.name[language] ?? t.services.name} · {formatMoney(booking.totalPrice, t.common.amd)}
                    </p>
                  </button>

                  <a
                    href={`tel:${booking.phone}`}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-champagne/70 bg-porcelain px-4 py-2 text-sm font-semibold text-ink"
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {t.bookings.callClient}
                  </a>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-champagne bg-white/75 p-8 text-center shadow-sm">
            <p className="text-lg font-semibold">{t.calendar.noBookingsThisDay}</p>
            <p className="mt-2 text-sm text-graphite/60">
              {t.calendar.addBooking}
            </p>
            <button
              type="button"
              onClick={() => onAddBooking(dateKey)}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-sage px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t.calendar.addBooking}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
