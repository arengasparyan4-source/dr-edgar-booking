"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Booking } from "@/types/domain";
import type { CalendarDaySchedule } from "@/lib/availability/calendarSchedule";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { BOOKING_STATUS_STYLES } from "./BookingStatusBadge";
import { formatCompactDate, formatWeekdayShort, toDateKey } from "./calendarUtils";

/** Pixel height of one 30-minute row; also the minimum touch target. */
const ROW_HEIGHT = 44;
const STEP = 30;
const DEFAULT_START = 9 * 60;
const DEFAULT_END = 19 * 60;

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const label = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

type PositionedBooking = {
  booking: Booking;
  start: number;
  end: number;
  lane: number;
  lanes: number;
};

/** Side-by-side lanes for overlapping bookings (e.g. a cancelled one and its replacement). */
const layoutBookings = (bookings: Booking[]): PositionedBooking[] => {
  const items = bookings
    .map((booking) => ({
      booking,
      start: toMinutes(booking.startTime),
      end: Math.max(toMinutes(booking.endTime), toMinutes(booking.startTime) + 15)
    }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const result: PositionedBooking[] = [];
  let cluster: PositionedBooking[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((item) => item.lane + 1));
    cluster.forEach((item) => result.push({ ...item, lanes }));
    cluster = [];
  };

  for (const item of items) {
    if (item.start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }

    const usedLanes = new Set(
      cluster.filter((other) => other.end > item.start).map((other) => other.lane)
    );
    let lane = 0;
    while (usedLanes.has(lane)) {
      lane += 1;
    }

    cluster.push({ ...item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.end);
  }

  flush();
  return result;
};

export default function CalendarTimeGrid({
  days,
  bookingsByDate,
  scheduleByDate,
  selectedDateKey,
  onSelectBooking,
  onSelectFreeSlot,
  onSelectDay
}: {
  days: Date[];
  bookingsByDate: Record<string, Booking[]>;
  scheduleByDate: Record<string, CalendarDaySchedule>;
  selectedDateKey: string;
  onSelectBooking: (booking: Booking) => void;
  onSelectFreeSlot: (dateKey: string, startTime: string) => void;
  onSelectDay: (dateKey: string) => void;
}) {
  const { language, t } = useLanguage();
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);
  const todayKey = toDateKey(new Date());
  const dateKeys = days.map(toDateKey);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    };
    const timeoutId = window.setTimeout(update, 0);
    const intervalId = window.setInterval(update, 60_000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  // Visible hours: union of working hours and bookings of the shown days,
  // rounded out to whole hours.
  let gridStart = Number.POSITIVE_INFINITY;
  let gridEnd = Number.NEGATIVE_INFINITY;
  for (const dateKey of dateKeys) {
    const schedule = scheduleByDate[dateKey];
    if (schedule?.working && schedule.startTime && schedule.endTime) {
      gridStart = Math.min(gridStart, toMinutes(schedule.startTime));
      gridEnd = Math.max(gridEnd, toMinutes(schedule.endTime));
    }
    for (const booking of bookingsByDate[dateKey] ?? []) {
      gridStart = Math.min(gridStart, toMinutes(booking.startTime));
      gridEnd = Math.max(gridEnd, toMinutes(booking.endTime));
    }
  }
  if (!Number.isFinite(gridStart) || !Number.isFinite(gridEnd) || gridEnd <= gridStart) {
    gridStart = DEFAULT_START;
    gridEnd = DEFAULT_END;
  }
  gridStart = Math.floor(gridStart / 60) * 60;
  gridEnd = Math.min(24 * 60, Math.ceil(gridEnd / 60) * 60);

  const rows = Array.from(
    { length: (gridEnd - gridStart) / STEP },
    (_, index) => gridStart + index * STEP
  );
  const height = rows.length * ROW_HEIGHT;
  const top = (minutes: number) => ((minutes - gridStart) / STEP) * ROW_HEIGHT;
  const isWeek = days.length > 1;
  const columns = isWeek
    ? `3.5rem repeat(${days.length}, minmax(7.5rem, 1fr))`
    : "3.5rem minmax(0, 1fr)";

  return (
    <div
      className="overflow-x-auto rounded-[2rem] border border-champagne/70 bg-porcelain shadow-soft"
      data-testid={isWeek ? "calendar-week-grid" : "calendar-day-grid"}
    >
      <div className="min-w-full" style={{ display: "grid", gridTemplateColumns: columns }}>
        <div className="sticky left-0 z-20 border-b border-champagne/70 bg-pearl" />
        {days.map((date, index) => {
          const dateKey = dateKeys[index];
          const isToday = dateKey === todayKey;
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDay(dateKey)}
              className={`border-b border-l border-champagne/70 px-2 py-2 text-center ${
                selectedDateKey === dateKey ? "bg-white" : "bg-pearl"
              }`}
            >
              <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-graphite/55">
                {formatWeekdayShort(date, language)}
              </span>
              <span
                className={`mt-1 inline-flex min-h-7 items-center justify-center rounded-xl px-2 text-sm font-semibold ${
                  isToday ? "bg-ink text-white" : "text-ink"
                }`}
              >
                {formatCompactDate(date, language)}
              </span>
            </button>
          );
        })}

        <div className="sticky left-0 z-10 bg-porcelain" style={{ height }}>
          {rows.map((minutes) => (
            <div
              key={minutes}
              className="relative border-b border-champagne/40 pr-2 text-right text-[11px] font-semibold text-graphite/50"
              style={{ height: ROW_HEIGHT }}
            >
              {minutes % 60 === 0 ? <span className="relative top-0.5">{label(minutes)}</span> : null}
            </div>
          ))}
        </div>

        {days.map((date, index) => {
          const dateKey = dateKeys[index];
          const schedule = scheduleByDate[dateKey];
          const dayBookings = layoutBookings(bookingsByDate[dateKey] ?? []);
          const unavailable = [
            ...(schedule?.breaks ?? []).map((item) => ({ ...item, text: t.calendar.breakTime })),
            ...(schedule?.blocked ?? []).map((item) => ({
              ...item,
              text: item.reason || t.calendar.blockedTime
            }))
          ];

          return (
            <div
              key={dateKey}
              className={`relative border-l border-champagne/70 ${schedule?.working === false ? "bg-graphite/[0.04]" : "bg-white/70"}`}
              style={{ height }}
              data-testid={`calendar-column-${dateKey}`}
            >
              {rows.map((minutes) => (
                <div
                  key={minutes}
                  className={`border-b ${minutes % 60 === 0 ? "border-champagne/50" : "border-champagne/25"}`}
                  style={{ height: ROW_HEIGHT }}
                />
              ))}

              {schedule?.working === false ? (
                <p className="absolute inset-x-2 top-3 text-center text-xs font-semibold text-graphite/50">
                  {t.calendar.dayOff}
                </p>
              ) : null}

              {unavailable.map((item) => (
                <div
                  key={`${item.startTime}-${item.endTime}-${item.text}`}
                  className="pointer-events-none absolute inset-x-0 overflow-hidden bg-[repeating-linear-gradient(135deg,rgba(60,60,60,0.06)_0,rgba(60,60,60,0.06)_6px,transparent_6px,transparent_12px)] px-2 py-1 text-[11px] font-semibold text-graphite/55"
                  style={{
                    top: top(toMinutes(item.startTime)),
                    height: Math.max(ROW_HEIGHT / 2, top(toMinutes(item.endTime)) - top(toMinutes(item.startTime)))
                  }}
                >
                  {item.text}
                </div>
              ))}

              {(schedule?.freeSlots ?? []).map((slot) => (
                <button
                  key={slot.startTime}
                  type="button"
                  onClick={() => onSelectFreeSlot(dateKey, slot.startTime)}
                  className="group absolute inset-x-1 flex items-center gap-1 rounded-xl border border-dashed border-sage/40 px-2 text-[11px] font-semibold text-sage/80 transition hover:border-sage hover:bg-sage/10 focus:outline-none focus:ring-2 focus:ring-sage/40"
                  style={{ top: top(toMinutes(slot.startTime)) + 2, height: ROW_HEIGHT - 4 }}
                  aria-label={`${t.calendar.freeSlot} ${slot.startTime}`}
                  data-testid={`free-slot-${dateKey}-${slot.startTime}`}
                >
                  <Plus className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" aria-hidden="true" />
                  {slot.startTime}
                </button>
              ))}

              {dayBookings.map(({ booking, start, end, lane, lanes }) => {
                const style = BOOKING_STATUS_STYLES[booking.status];
                const faded = booking.status === "cancelled" || booking.status === "no_show";
                return (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => onSelectBooking(booking)}
                    className={`absolute z-[5] overflow-hidden rounded-xl border px-2 py-1 text-left shadow-sm transition hover:z-10 hover:shadow-soft ${style.panelClass} ${faded ? "opacity-60" : ""}`}
                    style={{
                      top: top(start) + 1,
                      height: Math.max(ROW_HEIGHT - 2, top(end) - top(start) - 2),
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`
                    }}
                    data-testid={`calendar-booking-${booking.id}`}
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-bold">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${style.dotClass}`} aria-hidden="true" />
                      {booking.startTime}–{booking.endTime}
                    </span>
                    <span className={`block truncate text-xs font-semibold ${faded ? "line-through" : ""}`}>
                      {`${booking.firstName} ${booking.lastName}`.trim()}
                    </span>
                    <span className="block truncate text-[11px] text-graphite/65">
                      {booking.servicesSnapshot.map((service) => service.name[language]).join(", ")}
                    </span>
                  </button>
                );
              })}

              {dateKey === todayKey && nowMinutes !== null && nowMinutes >= gridStart && nowMinutes <= gridEnd ? (
                <div
                  className="pointer-events-none absolute inset-x-0 z-[6] h-0.5 bg-red-500"
                  style={{ top: top(nowMinutes) }}
                  aria-hidden="true"
                >
                  <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
