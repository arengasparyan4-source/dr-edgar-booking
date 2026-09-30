"use client";

import type { Booking } from "@/types/domain";
import { useLanguage } from "@/lib/i18n/useLanguage";
import CalendarDayCell from "./CalendarDayCell";
import { formatCompactDate, getMonthDays, getWeekDays, toDateKey } from "./calendarUtils";

export type CalendarViewMode = "month" | "week" | "day";

export default function CalendarMonthView({
  viewMode,
  visibleDate,
  bookingsByDate,
  freeCountByDate = {},
  selectedDateKey,
  onSelectDay
}: {
  viewMode: CalendarViewMode;
  visibleDate: Date;
  bookingsByDate: Record<string, Booking[]>;
  freeCountByDate?: Record<string, number>;
  selectedDateKey: string;
  onSelectDay: (dateKey: string) => void;
}) {
  const { language, t } = useLanguage();
  const todayKey = toDateKey(new Date());
  const currentMonth = visibleDate.getMonth();
  const days =
    viewMode === "month"
      ? getMonthDays(visibleDate)
      : viewMode === "week"
        ? getWeekDays(visibleDate)
        : [visibleDate];

  if (viewMode === "day") {
    const dateKey = toDateKey(visibleDate);
    return (
      <div className="rounded-[2rem] border border-champagne/70 bg-porcelain p-3 shadow-soft">
        <CalendarDayCell
          date={visibleDate}
          dateKey={dateKey}
          bookings={bookingsByDate[dateKey] ?? []}
          isCurrentMonth
          isToday={dateKey === todayKey}
          isSelected={selectedDateKey === dateKey}
          onSelect={onSelectDay}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-champagne/70 bg-porcelain shadow-soft">
      <div className={`grid ${viewMode === "week" ? "grid-cols-7" : "grid-cols-7"} border-b border-champagne/70 bg-pearl`}>
        {t.weekdays.slice(1).concat(t.weekdays[0]).map((day, index) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-graphite/55 sm:text-xs"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 1)}</span>
            {viewMode === "week" ? (
              <span className="mt-1 block text-[10px] normal-case tracking-normal text-graphite/45">
                {formatCompactDate(days[index], language)}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((date) => {
          const dateKey = toDateKey(date);

          return (
            <CalendarDayCell
              key={dateKey}
              date={date}
              dateKey={dateKey}
              bookings={bookingsByDate[dateKey] ?? []}
              freeCount={freeCountByDate[dateKey] ?? 0}
              isCurrentMonth={viewMode !== "month" || date.getMonth() === currentMonth}
              isToday={dateKey === todayKey}
              isSelected={selectedDateKey === dateKey}
              onSelect={onSelectDay}
            />
          );
        })}
      </div>
    </div>
  );
}
