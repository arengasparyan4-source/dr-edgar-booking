"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  Phone,
  RotateCcw,
  Search,
  X,
  UserX
} from "lucide-react";
import { adminFetch } from "@/lib/admin/adminFetch";
import AdminShell from "@/components/admin/AdminShell";
import BookingStatusBadge from "@/components/admin/BookingStatusBadge";
import ServiceCategoryBadge, { SERVICE_CATEGORY_COLORS } from "@/components/admin/ServiceCategoryBadge";
import { translateApiError } from "@/lib/i18n/apiError";
import { useLanguage } from "@/lib/i18n/useLanguage";
import type { Booking, BookingStatus } from "@/types/domain";
import { canMarkNoShow, canTransition } from "@/lib/bookings/bookingStatus";
import { formatDate, formatDateTime as formatInstant, formatNumber } from "@/lib/i18n/formatDate";

const statusOptions: Array<BookingStatus | "all"> = [
  "all",
  "pending",
  "confirmed",
  "cancelled",
  "reschedule_requested",
  "completed",
  "no_show"
];

const formatMoney = (value: number, amd: string) =>
  `${formatNumber(value)} ${amd}`;

export default function AdminBookingsPage() {
  const { language, t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingAction, setLoadingAction] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("all");
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadBookings = () => {
    adminFetch("/api/admin/bookings")
      .then((response) => response.json())
      .then((data) => setBookings(data.bookings ?? []))
      .catch(() => setBookings([]));
  };

  useEffect(loadBookings, []);

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();

    return bookings.filter((booking) => {
      const matchesQuery = normalizedQuery
        ? `${booking.firstName} ${booking.lastName} ${booking.phone}`
            .toLowerCase()
            .includes(normalizedQuery)
        : true;
      const matchesStatus = status === "all" || booking.status === status;
      const matchesDate = !date || booking.date === date;
      const matchesCategory =
        category === "all" ||
        booking.servicesSnapshot.some((service) => service.category === category);

      return matchesQuery && matchesStatus && matchesDate && matchesCategory;
    });
  }, [bookings, category, date, query, status]);

  const runAction = async (bookingId: string, action: string, extra = {}) => {
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
          : t.common.saved
      });
      loadBookings();
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    } finally {
      setLoadingAction("");
    }
  };

  const changeDateTime = async (booking: Booking) => {
    const nextDate = window.prompt(t.bookings.date, booking.date);
    if (!nextDate) {
      return;
    }

    const nextStartTime = window.prompt(t.bookings.time, booking.startTime);
    if (!nextStartTime) {
      return;
    }

    const nextEndTime = window.prompt(t.bookings.changeDateTime, booking.endTime);
    if (!nextEndTime) {
      return;
    }

    await runAction(booking.id, "changeDateTime", {
      slot: {
        date: nextDate,
        startTime: nextStartTime,
        endTime: nextEndTime
      }
    });
  };

  // Only actions the booking's status allows are shown (the server checks
  // the same rules in bookingStatus.ts).
  const actionButtons = (booking: Booking) => {
    const isOpen = !["cancelled", "completed", "no_show"].includes(booking.status);
    const canConfirm = booking.status === "pending" || booking.status === "reschedule_requested";
    const canComplete = booking.status === "confirmed" || booking.status === "no_show";

    return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
      {canComplete ? (
        <button
          onClick={() => runAction(booking.id, "complete")}
          disabled={loadingAction === `${booking.id}:complete`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-50"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {booking.status === "no_show" ? t.bookings.markCameAfterAll : t.bookings.markCompleted}
        </button>
      ) : null}
      {canMarkNoShow(booking) ? (
        <button
          onClick={() => runAction(booking.id, "noShow")}
          disabled={loadingAction === `${booking.id}:noShow`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-800 disabled:opacity-50"
          data-testid="booking-action-no-show"
        >
          <UserX className="h-4 w-4" aria-hidden="true" />
          {t.bookings.markNoShow}
        </button>
      ) : null}
      {canConfirm ? (
      <button
        onClick={() => runAction(booking.id, "confirm")}
        disabled={loadingAction === `${booking.id}:confirm`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-sage px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        {t.bookings.confirm}
      </button>
      ) : null}
      {canTransition(booking.status, "cancelled") ? (
      <button
        onClick={() => runAction(booking.id, "cancel")}
        disabled={loadingAction === `${booking.id}:cancel`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#B85C55] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        <X className="h-4 w-4" aria-hidden="true" />
        {t.bookings.cancel}
      </button>
      ) : null}
      {isOpen ? (
      <>
      <button
        onClick={() => runAction(booking.id, "suggestReschedule")}
        disabled={loadingAction === `${booking.id}:suggestReschedule`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {t.bookings.suggestAnotherTime}
      </button>
      <button
        onClick={() => changeDateTime(booking)}
        disabled={loadingAction === `${booking.id}:changeDateTime`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
      >
        <CalendarClock className="h-4 w-4" aria-hidden="true" />
        {t.bookings.changeDateTime}
      </button>
      </>
      ) : null}
      <a
        href={`tel:${booking.phone}`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        {t.bookings.callClient}
      </a>
    </div>
    );
  };

  return (
    <AdminShell title={t.bookings.title} subtitle={t.bookings.subtitle}>
      <section className="rounded-3xl border border-champagne/60 bg-white/86 p-4 shadow-soft">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-graphite/45"
              aria-hidden="true"
            />
            <input
              className="field-control min-h-12 pl-12"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.bookings.searchPlaceholder}
            />
          </label>
          <select
            className="field-control min-h-12"
            value={status}
            onChange={(event) => setStatus(event.target.value as BookingStatus | "all")}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? t.bookings.allStatuses : t.status[option]}
              </option>
            ))}
          </select>
          <input
            className="field-control min-h-12"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label={t.bookings.filterByDate}
          />
          <select
            className="field-control min-h-12"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">{t.bookings.allCategories}</option>
            {Object.keys(SERVICE_CATEGORY_COLORS).map((categoryKey) => (
              <option key={categoryKey} value={categoryKey}>
                {t.categories[categoryKey as keyof typeof SERVICE_CATEGORY_COLORS]}
              </option>
            ))}
          </select>
        </div>
      </section>

      {notice ? (
        <p className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
          notice.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          {notice.text}
        </p>
      ) : null}

      <section className="hidden overflow-hidden rounded-3xl border border-champagne/60 bg-white/86 shadow-soft lg:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-pearl text-xs uppercase tracking-[0.14em] text-graphite/55">
            <tr>
              <th className="px-4 py-3">{t.bookings.client}</th>
              <th className="px-4 py-3">{t.bookings.services}</th>
              <th className="px-4 py-3">{t.bookings.date}</th>
              <th className="px-4 py-3">{t.bookings.status}</th>
              <th className="px-4 py-3">{t.bookings.price}</th>
              <th className="px-4 py-3">{t.common.details}</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
              <tr key={booking.id} className="border-t border-champagne/50 align-top" data-testid={`booking-row-${booking.id}`}>
                <td className="px-4 py-4">
                  <p className="font-semibold">
                    {booking.firstName} {booking.lastName}
                  </p>
                  <a href={`tel:${booking.phone}`} className="mt-1 block text-graphite/65">
                    {booking.phone}
                  </a>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {booking.servicesSnapshot.map((service) => (
                      <ServiceCategoryBadge key={service.id} category={service.category} />
                    ))}
                  </div>
                  <p className="mt-2 max-w-sm text-graphite/70">
                    {booking.servicesSnapshot.map((service) => service.name[language]).join(", ")}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold">{formatDate(booking.date, language)}</p>
                  <p className="text-graphite/65">
                    {booking.startTime}-{booking.endTime}
                  </p>
                  <p className="text-graphite/65">
                    {booking.totalDurationMinutes} {t.common.minutes}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <BookingStatusBadge status={booking.status} />
                </td>
                <td className="px-4 py-4 font-semibold">{formatMoney(booking.totalPrice, t.common.amd)}</td>
                <td className="px-4 py-4">{actionButtons(booking)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 lg:hidden">
        {filteredBookings.map((booking) => (
          <article
            key={booking.id}
            data-testid={`booking-card-${booking.id}`}
            className="rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold">
                  {booking.firstName} {booking.lastName}
                </p>
                <a href={`tel:${booking.phone}`} className="mt-1 block text-sm text-graphite/70">
                  {booking.phone}
                </a>
              </div>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="mt-4 text-sm font-semibold">
              {formatDate(booking.date, language)} · {booking.startTime}-{booking.endTime}
            </p>
            <p className="mt-2 text-sm text-graphite/75">
              {booking.servicesSnapshot.map((service) => service.name[language]).join(", ")}
            </p>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <span>{booking.totalDurationMinutes} {t.common.minutes}</span>
              <span>{formatMoney(booking.totalPrice, t.common.amd)}</span>
              <span>{t.bookings.createdAt}: {formatInstant(booking.createdAt, language)}</span>
              <span>{t.bookings.googleEvent}: {booking.googleCalendarEventId || "—"}</span>
            </div>
            {booking.comment ? (
              <p className="mt-3 rounded-2xl bg-pearl p-3 text-sm">
                {booking.comment}
              </p>
            ) : null}
            <div className="mt-4">{actionButtons(booking)}</div>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}
