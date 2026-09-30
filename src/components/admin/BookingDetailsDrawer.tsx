"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ClipboardList,
  Phone,
  RotateCcw,
  Save,
  UserX,
  X
} from "lucide-react";
import { canMarkNoShow, canTransition } from "@/lib/bookings/bookingStatus";
import type { Booking, Service } from "@/types/domain";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { ChannelPicker } from "@/components/ChannelIcon";
import BookingStatusBadge from "./BookingStatusBadge";
import ServiceCategoryBadge from "./ServiceCategoryBadge";
import { formatDateTitle, formatMoney, parseDateKey } from "./calendarUtils";
import { formatDate, formatDateTime as formatInstant } from "@/lib/i18n/formatDate";

const formatValue = (value?: string) => value || "—";

export type BookingDetailsAction =
  | "confirm"
  | "cancel"
  | "suggestReschedule"
  | "changeDateTime"
  | "updateDetails"
  | "complete"
  | "noShow"
  | "setChannel";

function DetailRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-2xl bg-pearl p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite/45">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-graphite">
        {value ?? "—"}
      </p>
    </div>
  );
}

export default function BookingDetailsDrawer({
  booking,
  loadingAction,
  services = [],
  onClose,
  onRunAction,
  onCreateHistory
}: {
  booking: Booking | null;
  loadingAction: string;
  services?: Service[];
  onClose: () => void;
  onRunAction: (
    bookingId: string,
    action: BookingDetailsAction,
    extra?: object
  ) => void | Promise<void>;
  onCreateHistory?: (booking: Booking) => void | Promise<void>;
}) {
  const { language, t } = useLanguage();
  const [draftServiceIds, setDraftServiceIds] = useState<string[]>([]);
  const [draftComment, setDraftComment] = useState("");

  useEffect(() => {
    if (!booking) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDraftServiceIds(booking.selectedServiceIds);
      setDraftComment(booking.comment ?? "");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [booking]);

  const editableServices = useMemo(() => {
    if (!booking) {
      return [];
    }

    const selectedIds = new Set([...booking.selectedServiceIds, ...draftServiceIds]);
    return services
      .filter((service) => service.active || selectedIds.has(service.id))
      .sort((a, b) => a.name[language].localeCompare(b.name[language]));
  }, [booking, draftServiceIds, language, services]);

  if (!booking) {
    return null;
  }

  const clientName = `${booking.firstName} ${booking.lastName}`.trim();
  const actionKey = (action: string) => `${booking.id}:${action}`;
  const isClosed =
    booking.status === "cancelled" ||
    booking.status === "completed" ||
    booking.status === "no_show";
  const servicesCanChange = Boolean(editableServices.length) && !isClosed;
  const canConfirm =
    booking.status === "pending" || booking.status === "reschedule_requested";
  const canCancel = canTransition(booking.status, "cancelled");
  const canReschedule = !isClosed;
  const canComplete =
    booking.status === "confirmed" || booking.status === "no_show";
  const showNoShow =
    booking.status === "confirmed" || booking.status === "completed";
  const noShowAllowed = canMarkNoShow(booking);
  const detailsDirty =
    draftComment !== (booking.comment ?? "") ||
    draftServiceIds.join("|") !== booking.selectedServiceIds.join("|");

  const toggleService = (serviceId: string) => {
    if (!servicesCanChange) {
      return;
    }

    setDraftServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  };

  const saveDetails = () => {
    if (!draftServiceIds.length) {
      return;
    }

    onRunAction(booking.id, "updateDetails", {
      selectedServiceIds: draftServiceIds,
      comment: draftComment
    });
  };
  const changeDateTime = () => {
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

    onRunAction(booking.id, "changeDateTime", {
      slot: {
        date: nextDate,
        startTime: nextStartTime,
        endTime: nextEndTime
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={t.common.close}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />
      <aside className="absolute bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto rounded-t-[2rem] bg-[#F8F3EF] p-4 shadow-premium sm:p-6 lg:bottom-auto lg:left-auto lg:top-0 lg:h-full lg:max-h-none lg:w-[34rem] lg:rounded-l-[2rem] lg:rounded-tr-none">
        <div className="sticky top-0 z-10 -mx-4 -mt-4 bg-[#F8F3EF]/95 px-4 pb-4 pt-4 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/50">
                {t.common.details}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{clientName}</h2>
              <div className="mt-3">
                <BookingStatusBadge status={booking.status} />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ink shadow-sm"
              aria-label={t.common.close}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-ink p-4 text-white shadow-soft">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-champagne">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            {t.bookings.date} / {t.bookings.time}
          </p>
          <p className="mt-2 text-xl font-semibold">
            {formatDateTitle(parseDateKey(booking.date), language)}
          </p>
          <p className="mt-1 text-sm text-white/75">
            {booking.startTime} - {booking.endTime} · {booking.totalDurationMinutes} {t.common.minutes}
          </p>
        </div>

        <section className="mt-4 rounded-3xl border border-champagne/70 bg-white/88 p-4" data-testid="booking-channel">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite/45">
            {t.channels.title}
          </p>
          <p className="mb-3 mt-1 text-xs text-graphite/60">{t.channels.hint}</p>
          <ChannelPicker
            value={booking.preferredChannel ?? "sms"}
            onChange={(channel) => {
              if (channel !== (booking.preferredChannel ?? "sms")) {
                void onRunAction(booking.id, "setChannel", { channel });
              }
            }}
            name="booking-drawer-channel"
          />
        </section>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onRunAction(booking.id, "confirm")}
            disabled={!canConfirm || loadingAction === actionKey("confirm")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sage px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {t.bookings.confirm}
          </button>
          <button
            type="button"
            onClick={() => onRunAction(booking.id, "cancel")}
            disabled={!canCancel || loadingAction === actionKey("cancel")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#B85C55] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t.bookings.cancel}
          </button>
          <button
            type="button"
            onClick={() => onRunAction(booking.id, "suggestReschedule")}
            disabled={!canReschedule || loadingAction === actionKey("suggestReschedule")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t.bookings.suggestAnotherTime}
          </button>
          <button
            type="button"
            onClick={changeDateTime}
            disabled={!canReschedule || loadingAction === actionKey("changeDateTime")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm disabled:opacity-50"
            title={t.bookings.changeDateTime}
          >
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            {t.bookings.changeDateTime}
          </button>
          <button
            type="button"
            onClick={() => onRunAction(booking.id, "complete")}
            disabled={!canComplete || loadingAction === actionKey("complete")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {booking.status === "no_show" ? t.bookings.markCameAfterAll : t.bookings.markCompleted}
          </button>
          {showNoShow ? (
            <button
              type="button"
              onClick={() => onRunAction(booking.id, "noShow")}
              disabled={!noShowAllowed || loadingAction === actionKey("noShow")}
              title={noShowAllowed ? undefined : t.bookings.noShowNotStarted}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-800 shadow-sm disabled:opacity-50"
              data-testid="booking-action-no-show"
            >
              <UserX className="h-4 w-4" aria-hidden="true" />
              {t.bookings.markNoShow}
            </button>
          ) : null}
          {onCreateHistory ? (
            <button
              type="button"
              onClick={() => onCreateHistory(booking)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm"
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              {t.bookings.createHistory}
            </button>
          ) : null}
          <a
            href={`tel:${booking.phone}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm sm:col-span-2"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {t.bookings.callClient}
          </a>
        </div>

        <section className="mt-5 rounded-3xl border border-champagne/70 bg-white/88 p-4 shadow-soft">
          <h3 className="text-lg font-semibold">{t.bookings.services}</h3>
          <div className="mt-3 grid gap-3">
            {booking.servicesSnapshot.map((service) => (
              <article
                key={service.id}
                className="rounded-2xl border border-champagne/60 bg-porcelain p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{service.name[language]}</p>
                    <p className="mt-1 text-sm text-graphite/60">
                      {service.description[language]}
                    </p>
                  </div>
                  <ServiceCategoryBadge category={service.category} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
                  <span className="rounded-full bg-white px-3 py-1">
                    {service.durationMinutes} {t.common.minutes}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1">
                    {formatMoney(service.price, t.common.amd)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {editableServices.length ? (
          <section className="mt-5 rounded-3xl border border-champagne/70 bg-white/88 p-4 shadow-soft">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/45">
                  {t.bookings.crmDetailsTitle}
                </p>
                <h3 className="text-lg font-semibold">
                  {t.bookings.crmDetailsSubtitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={saveDetails}
                disabled={
                  !detailsDirty ||
                  !draftServiceIds.length ||
                  loadingAction === actionKey("updateDetails")
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-45"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {t.common.save}
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {editableServices.map((service) => (
                <label
                  key={service.id}
                  className={`flex items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                    draftServiceIds.includes(service.id)
                      ? "border-sage/40 bg-sage/10"
                      : "border-champagne/60 bg-porcelain"
                  } ${servicesCanChange ? "cursor-pointer" : "opacity-70"}`}
                >
                  <input
                    type="checkbox"
                    checked={draftServiceIds.includes(service.id)}
                    disabled={!servicesCanChange}
                    onChange={() => toggleService(service.id)}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <strong className="block text-ink">{service.name[language]}</strong>
                    <span className="mt-1 block text-xs text-graphite/60">
                      {service.durationMinutes} {t.common.minutes} /{" "}
                      {formatMoney(service.price, t.common.amd)}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="field-label">{t.bookings.comment}</span>
              <textarea
                value={draftComment}
                onChange={(event) => setDraftComment(event.target.value)}
                className="field-control min-h-24"
              />
            </label>
          </section>
        ) : null}

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <DetailRow label={t.bookings.client} value={clientName} />
          <DetailRow label={t.bookings.phone} value={booking.phone} />
          <DetailRow label={t.bookings.price} value={formatMoney(booking.totalPrice, t.common.amd)} />
          <DetailRow label={t.bookings.date} value={formatDate(booking.date, language)} />
          <DetailRow label={t.bookings.time} value={`${booking.startTime} - ${booking.endTime}`} />
          <DetailRow label={t.bookings.duration} value={`${booking.totalDurationMinutes} ${t.common.minutes}`} />
          <DetailRow label={t.bookings.createdAt} value={formatInstant(booking.createdAt, language)} />
          <DetailRow label={t.bookings.confirmedAt} value={formatValue(booking.confirmedAt)} />
          <DetailRow label={t.bookings.cancelledAt} value={formatValue(booking.cancelledAt)} />
          <DetailRow label={t.bookings.googleEvent} value={formatValue(booking.googleCalendarEventId)} />
          <DetailRow label={t.bookings.telegramMessage} value={formatValue(booking.telegramMessageId)} />
          <DetailRow label={t.bookings.bookingId} value={booking.id} />
        </section>

        <section className="mt-5 rounded-3xl border border-champagne/70 bg-white/88 p-4 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/45">
            {t.bookings.comment}
          </p>
          <p className="mt-2 text-sm leading-6 text-graphite/75">
            {booking.comment || "—"}
          </p>
        </section>
      </aside>
    </div>
  );
}
