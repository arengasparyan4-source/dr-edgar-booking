"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { adminFetch } from "@/lib/admin/adminFetch";
import type { Booking } from "@/types/domain";
import type { CalendarDaySchedule } from "@/lib/availability/calendarSchedule";
import { translateApiError } from "@/lib/i18n/apiError";
import { useLanguage } from "@/lib/i18n/useLanguage";
import BookingDetailsDrawer, {
  type BookingDetailsAction
} from "./BookingDetailsDrawer";
import CalendarFilters, { type CalendarFiltersState } from "./CalendarFilters";
import CalendarMonthView, { type CalendarViewMode } from "./CalendarMonthView";
import CalendarSummary from "./CalendarSummary";
import CalendarTimeGrid from "./CalendarTimeGrid";
import DayBookingsDrawer from "./DayBookingsDrawer";
import ManualBookingModal from "./ManualBookingModal";
import { BOOKING_STATUS_STYLES } from "./BookingStatusBadge";
import {
  formatCompactDate,
  formatDateTitle,
  formatMonth,
  getMonthRange,
  getWeekDays,
  toDateKey
} from "./calendarUtils";

const defaultFilters: CalendarFiltersState = {
  search: "",
  statuses: ["pending", "confirmed", "reschedule_requested", "completed", "no_show"],
  category: "all"
};

const getRangeForView = (visibleDate: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") {
    return getMonthRange(visibleDate);
  }

  if (viewMode === "week") {
    const week = getWeekDays(visibleDate);
    return {
      from: toDateKey(week[0]),
      to: toDateKey(week[week.length - 1])
    };
  }

  const dateKey = toDateKey(visibleDate);
  return { from: dateKey, to: dateKey };
};

const viewStorageKey = "dr_edgar_admin_calendar_view";
const viewModes: CalendarViewMode[] = ["day", "week", "month"];

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

export default function AdminCalendar() {
  const { language, t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [schedule, setSchedule] = useState<CalendarDaySchedule[]>([]);
  const [visibleDate, setVisibleDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [viewMode, setViewModeState] = useState<CalendarViewMode>("week");
  const [filters, setFilters] = useState<CalendarFiltersState>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState("");
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [manualBookingOpen, setManualBookingOpen] = useState(false);
  const [manualBookingClientId, setManualBookingClientId] = useState<string>();
  const [manualBookingTime, setManualBookingTime] = useState<string>();
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const visibleRange = useMemo(
    () => getRangeForView(visibleDate, viewMode),
    [visibleDate, viewMode]
  );

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(visibleRange);
      const response = await adminFetch(`/api/admin/calendar/bookings?${params.toString()}`);
      const data = (await response.json()) as {
        bookings?: Booking[];
        schedule?: CalendarDaySchedule[];
      };
      setBookings(data.bookings ?? []);
      setSchedule(data.schedule ?? []);
    } catch {
      setBookings([]);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }, [visibleRange]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBookings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBookings]);

  // Remembered view; on a first visit phones start with the day view, where
  // the hourly grid is readable without horizontal scrolling.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem(viewStorageKey);
      } catch {
        stored = null;
      }
      if (viewModes.includes(stored as CalendarViewMode)) {
        setViewModeState(stored as CalendarViewMode);
      } else if (window.matchMedia("(max-width: 639px)").matches) {
        setViewModeState("day");
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const setViewMode = (mode: CalendarViewMode) => {
    setViewModeState(mode);
    try {
      window.localStorage.setItem(viewStorageKey, mode);
    } catch {
      // Private mode: the choice just is not remembered.
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const clientId = new URLSearchParams(window.location.search).get("clientId");
      if (clientId) {
        setManualBookingClientId(clientId);
        setManualBookingOpen(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const filteredBookings = useMemo(() => {
    const query = normalize(filters.search);

    return bookings
      .filter((booking) => filters.statuses.includes(booking.status))
      .filter((booking) => {
        if (filters.category === "all") {
          return true;
        }

        return booking.servicesSnapshot.some(
          (service) => service.category === filters.category
        );
      })
      .filter((booking) => {
        if (!query) {
          return true;
        }

        return normalize(
          `${booking.firstName} ${booking.lastName} ${booking.phone}`
        ).includes(query);
      })
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  }, [bookings, filters]);

  const bookingsByDate = useMemo(() => {
    return filteredBookings.reduce<Record<string, Booking[]>>((acc, booking) => {
      acc[booking.date] = [...(acc[booking.date] ?? []), booking];
      return acc;
    }, {});
  }, [filteredBookings]);

  const scheduleByDate = useMemo(
    () =>
      schedule.reduce<Record<string, CalendarDaySchedule>>((acc, day) => {
        acc[day.date] = day;
        return acc;
      }, {}),
    [schedule]
  );

  const freeCountByDate = useMemo(
    () =>
      schedule.reduce<Record<string, number>>((acc, day) => {
        acc[day.date] = day.freeSlots.length;
        return acc;
      }, {}),
    [schedule]
  );

  // Month view shows the whole 6-week grid; totals cover only the month itself.
  const summaryRange = useMemo(() => {
    if (viewMode !== "month") {
      return visibleRange;
    }
    const first = new Date(visibleDate.getFullYear(), visibleDate.getMonth(), 1);
    const last = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 0);
    return { from: toDateKey(first), to: toDateKey(last) };
  }, [viewMode, visibleDate, visibleRange]);
  const inSummaryRange = (date: string) =>
    date >= summaryRange.from && date <= summaryRange.to;

  const selectedDayBookings = bookingsByDate[selectedDateKey] ?? [];
  const todayBookings = bookingsByDate[toDateKey(new Date())] ?? [];
  const activeCount = filteredBookings.filter(
    (booking) => booking.status !== "cancelled"
  ).length;
  const confirmedCount = filteredBookings.filter(
    (booking) => booking.status === "confirmed"
  ).length;
  const pendingCount = filteredBookings.filter(
    (booking) => booking.status === "pending"
  ).length;

  const movePeriod = (direction: number) => {
    setVisibleDate((date) => {
      if (viewMode === "month") {
        return new Date(date.getFullYear(), date.getMonth() + direction, 1);
      }

      const next = new Date(date);
      next.setDate(date.getDate() + direction * (viewMode === "week" ? 7 : 1));
      return next;
    });
  };

  const goToday = () => {
    const today = new Date();
    setVisibleDate(today);
    setSelectedDateKey(toDateKey(today));
    if (viewMode === "month") {
      setDayDrawerOpen(true);
    }
  };

  const openDay = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setVisibleDate(new Date(`${dateKey}T00:00:00`));
    setViewMode("day");
  };

  const handleSelectDay = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setDayDrawerOpen(true);
  };

  const runAction = async (
    bookingId: string,
    action: BookingDetailsAction,
    extra = {}
  ) => {
    setLoadingAction(`${bookingId}:${action}`);
    setNotice(null);
    try {
      const response = await adminFetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action, ...extra })
      });
      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(translateApiError(data, t));
      }

      setNotice({
        type: data.warnings?.length ? "error" : "success",
        text: data.warnings?.length
          ? data.warnings.join(", ")
          : action === "setChannel"
            ? t.channels.saved
            : t.common.saved
      });
      // A channel change keeps the drawer open on the updated booking.
      setSelectedBooking(action === "setChannel" && data.booking ? data.booking : null);
      await loadBookings();
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    } finally {
      setLoadingAction("");
    }
  };

  const openManualBookingForDate = (dateKey = selectedDateKey) => {
    setSelectedDateKey(dateKey);
    setManualBookingClientId(undefined);
    setManualBookingTime(undefined);
    setManualBookingOpen(true);
  };

  const openManualBookingForSlot = (dateKey: string, startTime: string) => {
    setSelectedDateKey(dateKey);
    setManualBookingClientId(undefined);
    setManualBookingTime(startTime);
    setManualBookingOpen(true);
  };

  const weekDays = getWeekDays(visibleDate);
  const periodTitle =
    viewMode === "month"
      ? formatMonth(visibleDate, language)
      : viewMode === "week"
        ? `${formatCompactDate(weekDays[0], language)} – ${formatCompactDate(weekDays[6], language)}`
        : formatDateTitle(visibleDate, language);

  const selectedTitle = formatDateTitle(
    new Date(`${selectedDateKey}T00:00:00`),
    language
  );

  return (
    <>
      <section className="rounded-[2rem] border border-champagne/70 bg-white/88 p-4 shadow-premium sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-pearl px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-graphite/60">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t.calendar.beautyCrm}
            </div>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              {t.calendar.bookingCalendar}
            </h2>
            <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-graphite/70 sm:block">
              {t.calendar.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[38rem]">
            <div className="rounded-2xl bg-pearl p-3">
              <p className="text-xs font-semibold text-graphite/55">{t.calendar.bookings}</p>
              <p className="mt-1 text-2xl font-semibold">{activeCount}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3">
              <p className="text-xs font-semibold text-graphite/55">{t.status.pending}</p>
              <p className="mt-1 text-2xl font-semibold">{pendingCount}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-xs font-semibold text-graphite/55">{t.status.confirmed}</p>
              <p className="mt-1 text-2xl font-semibold">{confirmedCount}</p>
            </div>
            <button
              type="button"
              onClick={goToday}
              className="rounded-2xl bg-ink p-3 text-left text-white"
            >
              <p className="text-xs font-semibold text-white/60">{t.calendar.today}</p>
              <p className="mt-1 text-2xl font-semibold">{todayBookings.length}</p>
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="inline-flex w-full items-center justify-between rounded-3xl border border-champagne/70 bg-porcelain p-2 shadow-sm sm:w-auto">
            <button
              type="button"
              onClick={() => movePeriod(-1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-graphite transition hover:bg-pearl"
              aria-label={t.calendar.previousPeriod}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-48 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-graphite/50">
                {t.calendar[viewMode]}
              </p>
              <p className="text-lg font-semibold" data-testid="calendar-period-title">
                {periodTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => movePeriod(1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-graphite transition hover:bg-pearl"
              aria-label={t.calendar.nextPeriod}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openManualBookingForDate()}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-sage px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t.calendar.addBooking}
            </button>
            <button
              type="button"
              onClick={goToday}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {t.calendar.today}
            </button>
            <button
              type="button"
              onClick={loadBookings}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold text-ink"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t.calendar.refresh}
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2 rounded-3xl bg-pearl p-1">
          {viewModes.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
              data-testid={`calendar-view-${mode}`}
              className={`min-h-11 flex-1 rounded-2xl px-3 text-sm font-semibold transition ${
                viewMode === mode ? "bg-white text-ink shadow-sm" : "text-graphite/60"
              }`}
            >
              {t.calendar[mode]}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(BOOKING_STATUS_STYLES) as Array<keyof typeof BOOKING_STATUS_STYLES>).map((status) => {
            const style = BOOKING_STATUS_STYLES[status];

            return (
              <span
                key={status}
                className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${style.badgeClass}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${style.dotClass}`} />
                {t.status[status]}
              </span>
            );
          })}
        </div>
      </section>

      <CalendarFilters filters={filters} onChange={setFilters} />

      {notice ? (
        <p className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
          notice.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          {notice.text}
        </p>
      ) : null}

      <section className="rounded-[2rem] border border-champagne/70 bg-white/72 p-3 shadow-premium sm:p-4">
        <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/45">
              {t.calendar.selectedDay}
            </p>
            <h3 className="mt-1 text-xl font-semibold">{selectedTitle}</h3>
          </div>
          <button
            type="button"
            onClick={() => setDayDrawerOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold text-ink"
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            {t.calendar.details} ({selectedDayBookings.length})
          </button>
        </div>

        {loading ? (
          <div className="grid min-h-80 place-items-center rounded-[2rem] bg-porcelain text-sm font-semibold text-graphite/60">
            {t.common.loading}
          </div>
        ) : viewMode === "month" ? (
          <CalendarMonthView
            viewMode={viewMode}
            visibleDate={visibleDate}
            bookingsByDate={bookingsByDate}
            freeCountByDate={freeCountByDate}
            selectedDateKey={selectedDateKey}
            onSelectDay={handleSelectDay}
          />
        ) : (
          <CalendarTimeGrid
            days={viewMode === "week" ? weekDays : [visibleDate]}
            bookingsByDate={bookingsByDate}
            scheduleByDate={scheduleByDate}
            selectedDateKey={selectedDateKey}
            onSelectBooking={(booking) => setSelectedBooking(booking)}
            onSelectFreeSlot={openManualBookingForSlot}
            onSelectDay={openDay}
          />
        )}
      </section>

      <CalendarSummary
        bookings={bookings.filter((booking) => inSummaryRange(booking.date))}
        schedule={schedule.filter((day) => inSummaryRange(day.date))}
      />

      <DayBookingsDrawer
        isOpen={dayDrawerOpen}
        dateKey={selectedDateKey}
        bookings={selectedDayBookings}
        onClose={() => setDayDrawerOpen(false)}
        onSelectBooking={(booking) => setSelectedBooking(booking)}
        onAddBooking={(dateKey) => openManualBookingForDate(dateKey)}
      />

      <BookingDetailsDrawer
        booking={selectedBooking}
        loadingAction={loadingAction}
        onClose={() => setSelectedBooking(null)}
        onRunAction={runAction}
      />

      <ManualBookingModal
        open={manualBookingOpen}
        initialClientId={manualBookingClientId}
        initialDate={selectedDateKey}
        initialStartTime={manualBookingTime}
        onClose={() => setManualBookingOpen(false)}
        onSaved={() => {
          setNotice({ type: "success", text: t.common.saved });
          void loadBookings();
        }}
      />
    </>
  );
}
