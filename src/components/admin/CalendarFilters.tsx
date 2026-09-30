"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import type { BookingStatus } from "@/types/domain";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { BOOKING_STATUS_STYLES } from "./BookingStatusBadge";
import { SERVICE_CATEGORY_COLORS, type ServiceCategoryKey } from "./ServiceCategoryBadge";

export type CalendarFiltersState = {
  search: string;
  statuses: BookingStatus[];
  category: "all" | ServiceCategoryKey;
};

const allStatuses = Object.keys(BOOKING_STATUS_STYLES) as BookingStatus[];
const categories = Object.entries(SERVICE_CATEGORY_COLORS) as Array<
  [ServiceCategoryKey, (typeof SERVICE_CATEGORY_COLORS)[ServiceCategoryKey]]
>;

export default function CalendarFilters({
  filters,
  onChange
}: {
  filters: CalendarFiltersState;
  onChange: (filters: CalendarFiltersState) => void;
}) {
  const { t } = useLanguage();

  const toggleStatus = (status: BookingStatus) => {
    const statuses = filters.statuses.includes(status)
      ? filters.statuses.filter((item) => item !== status)
      : [...filters.statuses, status];

    onChange({ ...filters, statuses });
  };

  return (
    <section className="rounded-[1.75rem] border border-champagne/70 bg-white/90 p-4 shadow-soft">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 xl:min-w-[18rem]">
          <label className="relative block">
            <span className="sr-only">{t.calendar.search}</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-graphite/45"
              aria-hidden="true"
            />
            <input
              value={filters.search}
              onChange={(event) => onChange({ ...filters, search: event.target.value })}
              placeholder={t.bookings.searchPlaceholder}
              className="min-h-12 w-full rounded-2xl border border-champagne/70 bg-porcelain py-3 pl-12 pr-4 text-base outline-none transition focus:border-ink focus:ring-4 focus:ring-blush/20"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-pearl px-3 text-xs font-bold uppercase tracking-[0.16em] text-graphite/55">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {t.calendar.filterByStatus}
          </span>
          {allStatuses.map((status) => {
            const style = BOOKING_STATUS_STYLES[status];
            const active = filters.statuses.includes(status);

            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-2xl border px-3 text-xs font-semibold transition ${
                  active
                    ? style.badgeClass
                    : "border-champagne/70 bg-white text-graphite/55"
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${style.dotClass}`} />
                {t.status[status]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onChange({ ...filters, category: "all" })}
          className={`min-h-10 shrink-0 rounded-2xl border px-3 text-xs font-semibold transition ${
            filters.category === "all"
              ? "border-ink bg-ink text-white"
              : "border-champagne/70 bg-white text-graphite/70"
          }`}
        >
          {t.categories.all}
        </button>
        {categories.map(([category, meta]) => (
          <button
            key={category}
            type="button"
            onClick={() => onChange({ ...filters, category })}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl border px-3 text-xs font-semibold transition ${
              filters.category === category
                ? meta.badgeClass
                : "border-champagne/70 bg-white text-graphite/70"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
            {t.categories[category]}
          </button>
        ))}
      </div>
    </section>
  );
}
